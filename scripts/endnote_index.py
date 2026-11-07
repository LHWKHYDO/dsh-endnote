# -*- coding: utf-8 -*-
"""从 EndNote 库重建只读索引（dsh-endnote 专用）。

- 以 SQLite mode=ro&immutable=1 打开 <lib>/sdb/sdb.eni，绝不写入库目录；
- 只读 os.walk 扫描 <lib>/PDF 做磁盘对账；
- 产物只有一个 JSON：--out 指定的路径（默认与脚本同目录的 endnote_index.json）。

用法：
    python endnote_index.py --lib "<EndNote 库目录>.Data" --out "<插件数据目录>/endnote_index.json"
"""
import argparse
import json
import os
import sqlite3
import struct
import sys
import xml.etree.ElementTree as ET
from datetime import datetime

# 统一 UTF-8 输出，避免 Windows 控制台默认 GBK 让插件侧收到乱码。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

# EndNote reference_type 编号 → 可读名称（按本机库样本归纳）
REF_TYPES = {
    0: "期刊文章", 1: "书籍", 2: "学位论文", 3: "会议论文集",
    7: "会议论文", 15: "网页", 28: "标准", 31: "电子文章", 33: "会议论文",
}


def open_db(db_path):
    """只读打开，禁止任何写入。"""
    return sqlite3.connect(f"file:{db_path}?mode=ro&immutable=1", uri=True)


def parse_groups(cur):
    """返回 [(组名, [refs_id, ...]), ...]。"""
    result = []
    cur.execute("SELECT group_id, spec, members FROM groups ORDER BY group_id")
    for gid, spec, mem in cur.fetchall():
        name = f"组{gid}"
        try:
            root = ET.fromstring(spec.decode("utf-8", errors="replace"))
            node = root.find(".//name")
            if node is not None and node.text:
                name = node.text
        except Exception:
            pass
        ids = []
        if mem and len(mem) >= 8:
            count = struct.unpack("<i", mem[4:8])[0]
            if count and len(mem) >= 8 + count * 4:
                ids = list(struct.unpack(f"<{count}i", mem[8:8 + count * 4]))
        result.append((name, ids))
    return result


def scan_disk_pdfs(pdf_dir):
    """返回 {相对路径: 绝对路径}，相对路径用 / 分隔。"""
    disk = {}
    if not os.path.isdir(pdf_dir):
        return disk
    for dirpath, _dirs, files in os.walk(pdf_dir):
        for name in files:
            if name.lower().endswith(".pdf"):
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, pdf_dir).replace("\\", "/")
                disk[rel] = full
    return disk


def build(lib_root):
    db_path = os.path.join(lib_root, "sdb", "sdb.eni")
    if not os.path.isfile(db_path):
        raise SystemExit(f"[dsh-endnote] 找不到 EndNote 数据库: {db_path}")
    pdf_dir = os.path.join(lib_root, "PDF")

    con = open_db(db_path)
    cur = con.cursor()
    groups_list = parse_groups(cur)

    ref2groups = {}
    for name, ids in groups_list:
        for rid in ids:
            ref2groups.setdefault(rid, []).append(name)

    ref2files = {}
    cur.execute("SELECT refs_id, file_path FROM file_res")
    for rid, file_path in cur.fetchall():
        ref2files.setdefault(rid, []).append(file_path)

    cur.execute(
        """
        SELECT id, trash_state, reference_type, author, year, title,
               secondary_title, publisher, keywords, abstract,
               electronic_resource_number, url,
               read_status, rating, added_to_library, record_last_updated
        FROM refs
        """
    )
    rows = cur.fetchall()

    # 读状态最近变更时间：sync.type=1 的行对应 refs，item_id 即 refs.id；只记录发生过变更的条目。
    read_ts = {}
    try:
        cur.execute(
            "SELECT item_id, changed_readstatus_timestamp FROM sync "
            "WHERE changed_readstatus_timestamp > 0"
        )
        read_ts = {rid: int(ts or 0) for rid, ts in cur.fetchall()}
    except Exception:
        read_ts = {}
    con.close()

    disk = scan_disk_pdfs(pdf_dir)
    entries = []
    trash_refs = 0
    trash_pdf_rels = set()

    for (rid, trash, rtype, author, year, title, sec_title, publisher,
         keywords, abstract, doi, url, read_status, rating,
         added_ts, updated_ts) in rows:
        registered = []
        for file_path in ref2files.get(rid, []):
            rel = file_path.replace("\\", "/")
            if not rel.lower().endswith(".pdf"):
                continue
            registered.append((rel, os.path.join(pdf_dir, *rel.split("/"))))
        if trash:
            trash_refs += 1
            for rel, _abs in registered:
                trash_pdf_rels.add(rel)
            continue

        files = [
            {"rel": rel, "abs": abs_path, "exists": os.path.isfile(abs_path)}
            for rel, abs_path in registered
        ]
        entries.append({
            "id": rid,
            "type": REF_TYPES.get(rtype, f"类型{rtype}"),
            "author": (author or "").replace("\r", "; ").replace("\n", "; ").strip(),
            "year": (year or "").strip(),
            "title": (title or "").strip(),
            "journal": (sec_title or publisher or "").strip(),
            "keywords": (keywords or "").replace("\r", "; ").replace("\n", "; ").strip(),
            "abstract": (abstract or "").strip()[:800],
            "doi": (doi or "").strip(),
            "url": (url or "").strip(),
            # EndNote 原生读状态：refs.read_status '1'=已读 '0'=未读；rating 0/20/…/100 → 0-5 星。
            "read": str(read_status or "").strip() == "1",
            "rating": int(str(rating or 0) or 0) // 20,
            "added_at": int(added_ts or 0),
            "updated_at": int(updated_ts or 0),
            "read_at": read_ts.get(rid, 0),
            "groups": ref2groups.get(rid, []),
            "files": files,
        })

    registered_rels = {f["rel"] for e in entries for f in e["files"]} | trash_pdf_rels
    orphans = sorted(set(disk) - registered_rels)
    missing = sorted(rel for rel in registered_rels if rel not in disk)

    return {
        "built_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "lib_root": lib_root,
        "stats": {
            "refs_total": len(entries) + trash_refs,
            "refs_active": len(entries),
            "refs_trash_skipped": trash_refs,
            "read_count": sum(1 for e in entries if e["read"]),
            "pdf_registered": len(registered_rels),
            "pdf_on_disk": len(disk),
            "groups_total": len(groups_list),
            "groups_nonempty": len([g for g in groups_list if g[1]]),
            "orphans": orphans,
            "missing": missing,
        },
        "entries": entries,
    }


def main():
    ap = argparse.ArgumentParser(description="重建 dsh-endnote 的 EndNote 只读索引")
    ap.add_argument("--lib", required=True, help="EndNote 库根目录（...Data 目录）")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "endnote_index.json"),
                    help="输出 JSON 路径")
    args = ap.parse_args()

    lib_root = os.path.abspath(args.lib)
    index = build(lib_root)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(index, handle, ensure_ascii=False)
    os.replace(tmp, out)

    stats = index["stats"]
    print(
        f"索引已写入 {out}\n"
        f"文献 {stats['refs_active']} 条（回收站 {stats['refs_trash_skipped']} 条跳过）｜"
        f"PDF 登记 {stats['pdf_registered']} = 磁盘 {stats['pdf_on_disk']}｜"
        f"分组 {stats['groups_total']}（非空 {stats['groups_nonempty']}）\n"
        f"对账：孤儿 {len(stats['orphans'])}、缺失 {len(stats['missing'])}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
