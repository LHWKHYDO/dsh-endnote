window.__ModuleLoader__.load({
  id: 'dsh-endnote',
  factory(require) {
    // 客户端半边没有 React 组件：它只做一件事——监听到 endnote_open 成功执行后，
    // 把对应 PDF 以 dsh-resource:// 地址打开在 DSH 自己的右侧栏（PDF 由宿主的文档预览渲染）。
    const PLUGIN = 'dsh-endnote'
    const TOOL_RESULT = 'tool/result'
    const SOURCE = 'dsh-endnote'

    // ------------------------------------------------------------------
    // 图形化配置页：侧栏「插件」页 → dsh-endnote 行 →「配置」。
    // 可选贡献：slots / locale / configForms 任一缺失时只降级配置页，PDF 打开不受影响。
    // 按官方 practices：不 require 宿主 UI 包，自绘控件，样式只引用 --dsw-alias-* 主题 token。
    // ------------------------------------------------------------------
    const SETTINGS_NS = 'dsh-endnote.settings'
    const BUNDLE_KEY = 'dsh-endnote'
    const ROW_KEY = 'dsh-endnote#dsh-endnote'
    /** 侧栏导航行与面板页显示名（通用名称，不随语言变化）。 */
    const PANEL_NAME = 'dsh-endnote'
    // 与主机半边 index.js 对齐的同源路由（document-relative，官方 open-in-app 同款）。
    const PANEL_DATA_PATH = '/dsh-endnote/panel-data'
    const OPEN_FOLDER_PATH = '/dsh-endnote/open-folder'

    const SETTINGS_TEXT = {
      en: {
        intro: 'Pick the local EndNote library folder (the *.Data directory). Saving applies immediately — no restart.',
        libraryPath: 'Active library',
        libraryPathHint: 'Read-only — chosen via "Switch" in the list below; search and open use this library.',
        notInList: 'The active library is not in the list — add it below to switch back easily.',
        emptyPath: 'No library selected — add your first EndNote library below, then click "Switch".',
        browse: 'Browse…',
        libs: 'Saved libraries',
        libsHint: 'The first entry is the primary library; "Switch" applies in one click.',
        addLib: 'Add',
        libName: 'Name',
        addPathPlaceholder: 'Path (leave empty and click Add to browse)',
        switchTo: 'Switch',
        makePrimary: 'Make primary',
        removeLib: 'Remove',
        currentBadge: 'Active',
        emptyLibs: 'No saved libraries yet — add one below.',
        dupLib: 'This library is already in the list.',
        limit: 'Default result limit',
        limitHint: 'Maximum number of hits one endnote_search call returns by default.',
        invalidPath: 'The folder path cannot be empty.',
        invalidLimit: 'Enter a positive whole number.',
        save: 'Save',
        discard: 'Discard',
        saving: 'Saving…',
        saved: 'Saved. Effective immediately.',
        conflict: 'The configuration changed elsewhere. Reopen this page and try again.',
        saveFailed: 'Saving failed — see the console for details.',
        notWritable: 'This profile is read-only; settings cannot be saved here.',
        loading: 'Loading configuration…',
        unavailable: 'Configuration unavailable for this plugin entry.',
        dash: 'Library dashboard',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        countLabel: 'Rows',
        viewLabel: 'Show',
        viewBoth: 'Both lists',
        statTotal: 'Entries',
        statPdf: 'With PDF',
        statRead: 'Read',
        statUnread: 'Unread',
        statUnknown: 'Unmarked',
        statRated: 'Rated',
        statGroups: 'Groups',
        statBuilt: 'Index built',
        recentRead: 'Recently read',
        recentAdded: 'Recently added',
        readBadge: 'Read ✓',
        unreadBadge: 'Unread ○',
        unknownBadge: 'Unmarked ·',
        dashHint: 'Click a title or a folder to open it in the system file manager.',
        dashEmpty: 'No reading records yet — open a PDF once with endnote_open.',
        dashAddedEmpty: 'The index has no added-at timestamps.',
        dashLoadFailed: 'Failed to load panel data.',
        openFailed: 'Could not open that folder.',
        sidebarTitle: 'Sidebar entry',
        sidebarOn: 'shown in the left sidebar',
        sidebarMissing: 'not registered on this page yet',
        sidebarOpen: 'Open panel',
        sidebarAdd: 'Add to sidebar',
        sidebarReload: 'Reload page',
        sidebarHint: 'The sidebar row stays put after every launch; it only has to be registered once per page load.',
      },
      zh: {
        intro: '选择本地 EndNote 库目录（*.Data 文件夹）。保存后立即生效，无需重启插件。',
        libraryPath: '当前生效库',
        libraryPathHint: '只读展示；由下方清单的「切换」决定，检索与打开使用该库。',
        notInList: '当前库不在清单中——在下方添加后即可一键切换回来。',
        emptyPath: '尚未选择库——请在下方添加第一个 EndNote 库，再点「切换」。',
        browse: '浏览…',
        libs: '已存库列表',
        libsHint: '第 1 个为主库；「切换」一键生效。',
        addLib: '添加',
        libName: '名称',
        addPathPlaceholder: '路径（留空则点「添加」浏览选择）',
        switchTo: '切换',
        makePrimary: '设为主库',
        removeLib: '删除',
        currentBadge: '当前',
        emptyLibs: '还没有已存库——用下方「添加」收进来。',
        dupLib: '该库已在列表中。',
        limit: '默认返回条数',
        limitHint: 'endnote_search 单次调用默认返回的最大命中数。',
        invalidPath: '库目录不能为空。',
        invalidLimit: '请输入 1 以上的整数。',
        save: '保存',
        discard: '放弃修改',
        saving: '保存中…',
        saved: '已保存，立即生效。',
        conflict: '配置在别处被修改，请重新打开本页再试。',
        saveFailed: '保存失败，详情见控制台。',
        notWritable: '当前 profile 只读，无法在此保存配置。',
        loading: '正在加载配置…',
        unavailable: '该插件条目的配置不可用。',
        dash: '文献库概览',
        refresh: '刷新',
        refreshing: '刷新中…',
        countLabel: '条数',
        viewLabel: '显示',
        viewBoth: '两者都显示',
        statTotal: '文献总数',
        statPdf: '带 PDF',
        statRead: '已读',
        statUnread: '未读',
        statUnknown: '未标记',
        statRated: '有评分',
        statGroups: '分组',
        statBuilt: '索引时间',
        recentRead: '最近阅读',
        recentAdded: '最近导入',
        readBadge: '已读✓',
        unreadBadge: '未读○',
        unknownBadge: '未标·',
        dashHint: '点击标题或文件夹可在系统文件管理器中打开。',
        dashEmpty: '还没有阅读记录——用 endnote_open 打开一次 PDF 即可。',
        dashAddedEmpty: '索引里没有入库时间。',
        dashLoadFailed: '面板数据加载失败。',
        openFailed: '无法打开该文件夹。',
        sidebarTitle: '侧栏入口',
        sidebarOn: '已显示在左侧栏',
        sidebarMissing: '本页尚未注册',
        sidebarOpen: '打开面板',
        sidebarAdd: '固定到侧栏',
        sidebarReload: '重新加载页面',
        sidebarHint: '注册一次后每次启动都会自动出现在侧栏；插件更新后需刷新页面一次。',
      },
    }

    const SETTINGS_CSS = [
      '.dshEndnoteCfg_root{display:flex;flex-direction:column;gap:16px;max-width:720px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}',
      '.dshEndnoteCfg_intro{margin:0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.dshEndnoteCfg_field{display:flex;flex-direction:column;gap:6px}',
      '.dshEndnoteCfg_label{font-size:13px;font-weight:500;color:var(--dsw-alias-label-secondary)}',
      '.dshEndnoteCfg_inputRow{display:flex;gap:8px;align-items:center}',
      '.dshEndnoteCfg_input{flex:1;min-width:0;box-sizing:border-box;height:30px;padding:0 10px;border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}',
      '.dshEndnoteCfg_input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}',
      '.dshEndnoteCfg_input[aria-invalid="true"]{border-color:var(--dsw-alias-state-warn-secondary)}',
      '.dshEndnoteCfg_inputNarrow{flex:0 0 120px}',
      '.dshEndnoteCfg_btn{box-sizing:border-box;height:30px;padding:0 14px;border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer}',
      '.dshEndnoteCfg_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshEndnoteCfg_btn:disabled{opacity:.5;cursor:default}',
      '.dshEndnoteCfg_btnPrimary{border-color:transparent;background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary);font-weight:500}',
      '.dshEndnoteCfg_hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.dshEndnoteCfg_error{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-warn-secondary)}',
      '.dshEndnoteCfg_notice{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dshEndnoteCfg_actions{display:flex;gap:8px;justify-content:flex-end}',
      '.dshEndnoteCfg_libs{display:flex;flex-direction:column;gap:8px}',
      '.dshEndnoteCfg_libsHead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
      '.dshEndnoteCfg_libRow{display:flex;align-items:center;gap:8px;padding:6px 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}',
      '.dshEndnoteCfg_libRow.is-active{border-color:var(--dsw-alias-state-business-primary)}',
      '.dshEndnoteCfg_badge{flex:none;font-size:11px;line-height:18px;height:18px;padding:0 6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.dshEndnoteCfg_badge.is-primary,.dshEndnoteCfg_badge.is-active{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary);font-weight:600}',
      '.dshEndnoteCfg_libName{flex:none;max-width:180px;font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dshEndnoteCfg_libPath{flex:1;min-width:0;font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dshEndnoteCfg_libActions{flex:none;display:flex;gap:6px}',
      '.dshEndnoteCfg_btnSm{height:24px;padding:0 8px;font-size:12px}',
      '.dshEndnoteCfg_addRow{display:flex;gap:8px;align-items:center}',
      '.dshEndnoteCfg_addName{flex:0 0 140px}',
      '.dshEndnoteCfg_addPath{flex:1}',
      '.dshEndnoteCfg_panel{flex:1 1 auto;min-height:0;height:100%;box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;padding:24px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}',
      '.dshEndnoteCfg_panel::-webkit-scrollbar{width:10px}',
      '.dshEndnoteCfg_panel::-webkit-scrollbar-track{background:transparent}',
      '.dshEndnoteCfg_panel::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:5px;background:var(--dsw-alias-border-l2);background-clip:padding-box}',
      '.dshEndnoteCfg_panel::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-tertiary);background-clip:padding-box}',
      '.dshEndnoteCfg_pageBody{max-width:960px;min-width:0}',
      '.dshEndnoteCfg_heading{margin:0 0 4px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.dshEndnoteCfg_dash{display:flex;flex-direction:column;gap:8px;padding:16px;margin:0 0 16px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}',
      '.dshEndnoteCfg_dashHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.dshEndnoteCfg_dashTitle{margin:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.dshEndnoteCfg_dashCtl{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.dshEndnoteCfg_dashCtlLabel{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dshEndnoteCfg_stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}',
      '.dshEndnoteCfg_statCard{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base)}',
      '.dshEndnoteCfg_statVal{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.dshEndnoteCfg_statLbl{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.dshEndnoteCfg_dashH4{margin:6px 0 0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.dshEndnoteCfg_dashList{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}',
      '.dshEndnoteCfg_dashRow{display:flex;align-items:baseline;gap:10px;padding:5px 6px;border-radius:var(--dsw-radius-sm)}',
      '.dshEndnoteCfg_dashRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshEndnoteCfg_linkBtn{flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:none;border:0;padding:0;font:inherit;font-size:13px;color:var(--dsw-alias-state-business-primary);cursor:pointer;text-align:left}',
      '.dshEndnoteCfg_linkBtn:hover:not(:disabled){text-decoration:underline}',
      '.dshEndnoteCfg_linkBtn:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}',
      '.dshEndnoteCfg_rowPath{flex:1;min-width:0;max-width:none;font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.dshEndnoteCfg_rowMeta{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.dshEndnoteCfg_sideRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 14px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}',
      '.dshEndnoteCfg_sideLabel{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.dshEndnoteCfg_sideState{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.dshEndnoteCfg_sideState.is-missing{color:var(--dsw-alias-label-secondary)}',
      '.dshEndnoteCfg_sideHint{margin:0;font-size:11px;color:var(--dsw-alias-label-tertiary)}',
    ].join('')

    /** 快照里的数组字段取值：volatile 数组可能以 { get() } 访问器到达。 */
    function arrayValue(value, fallback) {
      if (value === undefined || value === null) return fallback
      if (Array.isArray(value)) return value
      if (typeof value === 'object' && typeof value.get === 'function') {
        try {
          const got = value.get()
          return Array.isArray(got) ? got : fallback
        } catch {
          return fallback
        }
      }
      if (typeof value === 'object' && 'value' in value && Array.isArray(value.value)) return value.value
      return fallback
    }

    /** 归一化库列表草稿：只留带路径的项，按路径去重（大小写不敏感），缺名用目录名。 */
    function normalizeLibs(list) {
      if (!Array.isArray(list)) return []
      const seen = new Set()
      const out = []
      for (const item of list) {
        if (!item || typeof item !== 'object') continue
        const libPath = String(item.path ?? '').trim()
        if (!libPath) continue
        const key = libPath.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const name = String(item.name ?? '').trim() || libPath.split(/[\\/]+/).filter(Boolean).pop() || libPath
        out.push({ name, path: libPath })
      }
      return out
    }

    /** 快照字段取值：跨进程序列化后应是字符串/数字，这里防御性兜底。 */
    function fieldValue(value, fallback) {
      if (value === undefined || value === null) return fallback
      if (typeof value === 'string' || typeof value === 'number') return value
      if (typeof value === 'object' && typeof value.get === 'function') {
        try {
          const got = value.get()
          return got === undefined ? fallback : got
        } catch {
          return fallback
        }
      }
      if (typeof value === 'object' && 'value' in value) {
        return value.value === undefined ? fallback : value.value
      }
      return fallback
    }

    /**
     * 配置页组件：草稿态 + 保存/放弃，直接走 configForms 的共享控制器。
     * 官方页面渲染 plugins.row.config 时会传入 `form`（{ state, mutate }，绑定到该行的
     * 命名空间）——优先用它，避免自己去猜命名空间拿到 unavailable 的 scope。
     * @param {{ t?: (key: string) => string, scope?: any, form?: any, pickDirectory: () => Promise<string | null> }} props
     */
    function EndnoteSettings(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const scope = props.scope
      const official = props.form && props.form.state ? props.form : null
      const pickDirectory = props.pickDirectory
      const pathId = React.useId()
      const limitId = React.useId()

      const readSnapshot = () => {
        try {
          if (official) return official.state
          return scope && typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : null
        } catch {
          return null
        }
      }
      const [snapState, setSnapState] = React.useState(readSnapshot)
      // 官方 form 的 state 由插件页每次渲染传入（父组件订阅了配置镜像），
      // 无需再自己订阅；只有走 scope 时才需要 subscribe。
      const snap = official ? official.state : snapState
      React.useEffect(() => {
        if (official || !scope || typeof scope.subscribe !== 'function') return undefined
        return scope.subscribe(() => setSnapState(readSnapshot()))
      }, [scope, official])

      const [draft, setDraft] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [addName, setAddName] = React.useState('')
      const [addPath, setAddPath] = React.useState('')

      const ready = Boolean(snap && snap.status === 'ready' && snap.value)
      const writable = Boolean(snap && snap.writable)
      const base = { libraryPath: '', limit: 8, libraries: [] }
      if (ready) {
        base.libraryPath = String(fieldValue(snap.value.libraryPath, ''))
        const parsed = Number(fieldValue(snap.value.limit, 8))
        base.limit = Number.isFinite(parsed) && parsed >= 1 ? parsed : 8
        base.libraries = normalizeLibs(arrayValue(snap.value.libraries, []))
      }
      const working = draft || { libraryPath: base.libraryPath, limit: base.limit, libraries: base.libraries }
      const libsDirty = JSON.stringify(normalizeLibs(working.libraries)) !== JSON.stringify(base.libraries)
      const dirty = Boolean(draft) && (draft.libraryPath !== base.libraryPath || Number(draft.limit) !== base.limit || libsDirty)
      const pathInvalid = !String(working.libraryPath).trim()
      const limitValue = Number(working.limit)
      const limitInvalid = !Number.isFinite(limitValue) || limitValue < 1 || Math.floor(limitValue) !== limitValue
      const disabled = !writable || busy
      const canSave = ready && writable && dirty && !pathInvalid && !limitInvalid && !busy

      const patchDraft = (changes) => setDraft({ ...working, ...changes })
      const editLimit = (text) => patchDraft({ limit: text })

      /** 单一入口：上框只读，是否在清单里按路径匹配（决定是否提示补录）。 */
      const pathInList = working.libraries.some(
        (lib) => String(lib.path).trim().toLowerCase() === String(working.libraryPath).trim().toLowerCase(),
      )

      /** 提交入口：官方 form 优先，否则走 configForms scope。 */
      const mutateConfig = (ops, revision) =>
        official && typeof official.mutate === 'function' ? official.mutate(ops, revision) : scope.mutate(ops, revision)

      /** 把一份草稿整体提交（切换 = 改 libraryPath 后立即提交，一键生效）。 */
      const commit = async (next) => {
        if (busy) return
        const nextPath = String(next.libraryPath).trim()
        const nextLimit = Number(next.limit)
        const nextLibs = normalizeLibs(next.libraries)
        if (!nextPath) {
          setNotice(t('invalidPath'))
          return
        }
        if (!Number.isFinite(nextLimit) || nextLimit < 1 || Math.floor(nextLimit) !== nextLimit) {
          setNotice(t('invalidLimit'))
          return
        }
        const ops = []
        if (nextPath !== base.libraryPath) ops.push({ op: 'set', path: ['libraryPath'], value: nextPath })
        if (nextLimit !== base.limit) ops.push({ op: 'set', path: ['limit'], value: nextLimit })
        if (JSON.stringify(nextLibs) !== JSON.stringify(base.libraries)) ops.push({ op: 'set', path: ['libraries'], value: nextLibs })
        if (!ops.length) {
          setDraft(null)
          return
        }
        setBusy(true)
        setNotice('')
        try {
          const ok = await mutateConfig(ops, snap && snap.revision)
          if (ok) {
            setDraft(null)
            setNotice(t('saved'))
          } else {
            setNotice(t('conflict'))
          }
        } catch (error) {
          console.warn('[' + PLUGIN + '] 保存配置失败', error)
          setNotice(t('saveFailed'))
        } finally {
          setBusy(false)
        }
      }

      const save = async () => {
        if (!canSave) return
        await commit(working)
      }

      /** 一键切换：把目标库设为当前库并立即保存（连同未保存的列表改动一起提交）。 */
      const switchLibrary = async (target) => {
        if (disabled || busy) return
        const next = { ...working, libraryPath: target }
        setDraft(next)
        await commit(next)
      }

      const makePrimary = (index) => {
        if (disabled) return
        const libs = [...working.libraries]
        const [item] = libs.splice(index, 1)
        if (item) libs.unshift(item)
        patchDraft({ libraries: libs })
      }

      const removeLibrary = (index) => {
        if (disabled) return
        patchDraft({ libraries: working.libraries.filter((_, i) => i !== index) })
      }

      const addLibrary = async () => {
        if (disabled) return
        let target = addPath.trim()
        if (!target) {
          const dir = await pickDirectory()
          if (typeof dir === 'string' && dir) target = dir
        }
        if (!target) return
        if (working.libraries.some((lib) => lib.path.toLowerCase() === target.toLowerCase())) {
          setNotice(t('dupLib'))
          return
        }
        patchDraft({ libraries: [...working.libraries, { name: addName.trim(), path: target }] })
        setAddName('')
        setAddPath('')
      }

      const discard = () => {
        setDraft(null)
        setNotice('')
      }

      const h = React.createElement
      const status = !ready
        ? h('p', { key: 'status', className: 'dshEndnoteCfg_notice', role: 'status' },
            t(snap && snap.status === 'unavailable' ? 'unavailable' : 'loading'))
        : null
      const readOnly = ready && !writable
        ? h('p', { key: 'readonly', className: 'dshEndnoteCfg_notice', role: 'status' }, t('notWritable'))
        : null

      return h('div', { className: 'dshEndnoteCfg_root' },
        h('style', null, SETTINGS_CSS),
        h('p', { className: 'dshEndnoteCfg_intro' }, t('intro')),
        h('div', { className: 'dshEndnoteCfg_field' },
          h('label', { className: 'dshEndnoteCfg_label', htmlFor: pathId }, t('libraryPath')),
          h('input', {
            id: pathId,
            className: 'dshEndnoteCfg_input',
            type: 'text',
            value: working.libraryPath,
            spellCheck: false,
            readOnly: true,
            'aria-readonly': 'true',
            'aria-invalid': pathInvalid ? 'true' : undefined,
          }),
          h('p', { className: 'dshEndnoteCfg_hint' }, t('libraryPathHint')),
          pathInvalid
            ? h('p', { className: 'dshEndnoteCfg_error', role: 'status' }, t('emptyPath'))
            : (!pathInList ? h('p', { className: 'dshEndnoteCfg_hint' }, t('notInList')) : null),
        ),
        h('div', { className: 'dshEndnoteCfg_field' },
          h('label', { className: 'dshEndnoteCfg_label', htmlFor: limitId }, t('limit')),
          h('input', {
            id: limitId,
            className: 'dshEndnoteCfg_input dshEndnoteCfg_inputNarrow',
            type: 'number',
            min: 1,
            step: 1,
            value: working.limit,
            disabled,
            'aria-invalid': limitInvalid && draft ? 'true' : undefined,
            onChange: (event) => editLimit(event.target.value),
          }),
          h('p', { className: 'dshEndnoteCfg_hint' }, t('limitHint')),
          limitInvalid && draft ? h('p', { className: 'dshEndnoteCfg_error', role: 'status' }, t('invalidLimit')) : null,
        ),
        h('div', { className: 'dshEndnoteCfg_libs' },
          h('div', { className: 'dshEndnoteCfg_libsHead' },
            h('span', { className: 'dshEndnoteCfg_label' }, t('libs')),
            h('span', { className: 'dshEndnoteCfg_hint' }, t('libsHint')),
          ),
          working.libraries.length === 0
            ? h('p', { className: 'dshEndnoteCfg_hint' }, t('emptyLibs'))
            : working.libraries.map((lib, index) => {
                const active = lib.path.toLowerCase() === String(working.libraryPath).trim().toLowerCase()
                const primary = index === 0
                return h('div', { key: lib.path + '@' + index, className: 'dshEndnoteCfg_libRow' + (active ? ' is-active' : '') },
                  h('span', { className: 'dshEndnoteCfg_badge' + (primary ? ' is-primary' : '') }, primary ? '★主' : '☆'),
                  h('span', { className: 'dshEndnoteCfg_libName', title: lib.name }, lib.name),
                  h('span', { className: 'dshEndnoteCfg_libPath', title: lib.path }, lib.path),
                  active ? h('span', { className: 'dshEndnoteCfg_badge is-active' }, t('currentBadge')) : null,
                  h('div', { className: 'dshEndnoteCfg_libActions' },
                    h('button', { className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnSm', type: 'button', disabled: disabled || active, onClick: () => switchLibrary(lib.path) }, t('switchTo')),
                    h('button', { className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnSm', type: 'button', disabled: disabled || primary, onClick: () => makePrimary(index) }, t('makePrimary')),
                    h('button', { className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnSm', type: 'button', disabled, onClick: () => removeLibrary(index) }, t('removeLib')),
                  ),
                )
              }),
          h('div', { className: 'dshEndnoteCfg_addRow' },
            h('input', {
              className: 'dshEndnoteCfg_input dshEndnoteCfg_addName',
              type: 'text',
              placeholder: t('libName'),
              value: addName,
              spellCheck: false,
              disabled,
              onChange: (event) => setAddName(event.target.value),
            }),
            h('input', {
              className: 'dshEndnoteCfg_input dshEndnoteCfg_addPath',
              type: 'text',
              placeholder: t('addPathPlaceholder'),
              value: addPath,
              spellCheck: false,
              disabled,
              onChange: (event) => setAddPath(event.target.value),
            }),
            h('button', { className: 'dshEndnoteCfg_btn', type: 'button', disabled, onClick: addLibrary }, t('addLib')),
          ),
        ),
        status,
        readOnly,
        notice ? h('p', { className: 'dshEndnoteCfg_notice', role: 'status' }, notice) : null,
        h('div', { className: 'dshEndnoteCfg_actions' },
          h('button', {
            className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnPrimary',
            type: 'button',
            disabled: !canSave,
            onClick: save,
          }, busy ? t('saving') : t('save')),
          h('button', {
            className: 'dshEndnoteCfg_btn',
            type: 'button',
            disabled: !dirty || busy,
            onClick: discard,
          }, t('discard')),
        ),
      )
    }

    /** 侧栏导航行图标：宿主按 {size, active} 调用，颜色继承 currentColor。 */
    function PanelIcon(props) {
      const size = (props && props.size) || 16
      const h = React.createElement
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
        h('path', { d: 'M3 2.5h7.2L13 5.2v8.3H3z' }),
        h('path', { d: 'M10.2 2.5v2.7H13' }),
        h('path', { d: 'M5.4 8.2h5.2M5.4 10.6h5.2' }),
      )
    }

    /**
     * 侧栏面板的「文献库概览」模块（面板页专用）：
     * 统计汇总卡片 + 最近阅读列表（数量可选）+ 可选最近导入 + 刷新按钮。
     * 数据走主机 webServer 的同源路由；标题/文件夹点击 → 打开文件夹路由。
     */
    function EndnoteDashboard(props) {
      const h = React.createElement
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const [count, setCount] = React.useState(10)
      // 显示内容：read=只看最近阅读 / added=只看最近导入 / both=两者都显示
      const [view, setView] = React.useState('read')
      const [tick, setTick] = React.useState(0)
      const [busy, setBusy] = React.useState(true)
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const [data, setData] = React.useState(null)

      React.useEffect(() => {
        let alive = true
        setBusy(true)
        setNotice('')
        const recentQuery = view === 'added' ? 1 : count
        const addedQuery = view === 'read' ? 0 : count
        const query = `?recent=${recentQuery}&added=${addedQuery}`
        fetch(PANEL_DATA_PATH + query, { headers: { accept: 'application/json' } })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return response.json()
          })
          .then((json) => {
            if (!alive) return
            setData(json || null)
            setError(json && json.ok ? '' : String((json && json.error) || t('dashLoadFailed')))
          })
          .catch((fetchError) => {
            if (alive) setError(String((fetchError && fetchError.message) || fetchError))
          })
          .finally(() => {
            if (alive) setBusy(false)
          })
        return () => {
          alive = false
        }
      }, [count, view, tick])

      const openFolder = (folder) => {
        if (!folder) return
        setNotice('')
        fetch(OPEN_FOLDER_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path: folder }),
        })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
          })
          .catch((fetchError) => setNotice(`${t('openFailed')} (${String((fetchError && fetchError.message) || fetchError)})`))
      }

      const formatTs = (epoch) => {
        const date = new Date(Number(epoch) * 1000)
        const pad = (n) => String(n).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
      }
      /** 文件夹只显示末两段（完整路径放 title），点击打开。 */
      const shortFolder = (folder) => {
        const sep = folder.indexOf('\\') !== -1 ? '\\' : '/'
        const parts = String(folder).split(/[\\/]/).filter(Boolean)
        return parts.length > 2 ? `…${sep}${parts.slice(-2).join(sep)}` : folder
      }
      const readBadge = (read) => (read === 'read' ? t('readBadge') : read === 'unread' ? t('unreadBadge') : t('unknownBadge'))
      const statCard = (label, value) =>
        h('div', { className: 'dshEndnoteCfg_statCard', key: label },
          h('span', { className: 'dshEndnoteCfg_statVal' }, String(value)),
          h('span', { className: 'dshEndnoteCfg_statLbl' }, label),
        )
      const row = (item, timeLabel, timeValue) =>
        h('li', { className: 'dshEndnoteCfg_dashRow', key: `${item.id}-${timeValue}` },
          h('button', {
            className: 'dshEndnoteCfg_linkBtn',
            type: 'button',
            title: t('dashHint'),
            disabled: !item.folder,
            onClick: () => openFolder(item.folder),
          }, item.year ? `${item.title} (${item.year})` : item.title),
          h('span', { className: 'dshEndnoteCfg_rowMeta' }, [
            readBadge(item.read),
            item.rating > 0 ? `★${item.rating}` : '',
            `${timeLabel} ${formatTs(timeValue)}`,
          ].filter(Boolean).join(' · ')),
          item.folder
            ? h('button', {
                className: 'dshEndnoteCfg_linkBtn dshEndnoteCfg_rowPath',
                type: 'button',
                title: `${t('dashHint')} — ${item.folder}`,
                onClick: () => openFolder(item.folder),
              }, shortFolder(item.folder))
            : null,
        )

      const stats = data && data.ok && data.stats ? data.stats : null
      const recentRead = (data && data.recentRead) || []
      const recentAdded = (data && data.recentAdded) || []

      return h('section', { className: 'dshEndnoteCfg_dash' },
        h('div', { className: 'dshEndnoteCfg_dashHead' },
          h('h3', { className: 'dshEndnoteCfg_dashTitle' }, t('dash')),
          h('div', { className: 'dshEndnoteCfg_dashCtl' },
            h('span', { className: 'dshEndnoteCfg_dashCtlLabel' }, t('viewLabel')),
            h('select', {
              className: 'dshEndnoteCfg_input dshEndnoteCfg_inputNarrow',
              value: view,
              disabled: busy,
              'aria-label': t('viewLabel'),
              onChange: (event) => {
                const next = event.target.value
                setView(next === 'added' || next === 'both' ? next : 'read')
              },
            }, [
              h('option', { key: 'read', value: 'read' }, t('recentRead')),
              h('option', { key: 'added', value: 'added' }, t('recentAdded')),
              h('option', { key: 'both', value: 'both' }, t('viewBoth')),
            ]),
            h('span', { className: 'dshEndnoteCfg_dashCtlLabel' }, t('countLabel')),
            h('select', {
              className: 'dshEndnoteCfg_input dshEndnoteCfg_inputNarrow',
              value: String(count),
              disabled: busy,
              'aria-label': t('countLabel'),
              onChange: (event) => setCount(Number(event.target.value) || 10),
            }, [5, 10, 20, 50].map((n) => h('option', { key: n, value: String(n) }, String(n)))),
            h('button', {
              className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnSm',
              type: 'button',
              disabled: busy,
              onClick: () => setTick((n) => n + 1),
            }, busy ? t('refreshing') : t('refresh')),
          ),
        ),
        h('p', { className: 'dshEndnoteCfg_hint' }, t('dashHint')),
        error ? h('p', { className: 'dshEndnoteCfg_error', role: 'status' }, error) : null,
        notice ? h('p', { className: 'dshEndnoteCfg_notice', role: 'status' }, notice) : null,
        stats
          ? h('div', { className: 'dshEndnoteCfg_stats' }, [
              statCard(t('statTotal'), stats.total),
              statCard(t('statPdf'), stats.withPdf),
              statCard(t('statRead'), stats.read),
              statCard(t('statUnread'), stats.unread),
              statCard(t('statUnknown'), stats.unknown),
              statCard(t('statRated'), stats.rated),
              statCard(t('statGroups'), stats.groups),
            ])
          : null,
        stats
          ? h('p', { className: 'dshEndnoteCfg_hint' }, `${t('statBuilt')}: ${stats.builtAt || '—'}${stats.indexFile ? ` · ${stats.indexFile}` : ''}`)
          : null,
        view === 'added' ? null : h('h4', { className: 'dshEndnoteCfg_dashH4' }, t('recentRead')),
        view === 'added'
          ? null
          : (recentRead.length
              ? h('ul', { className: 'dshEndnoteCfg_dashList' }, recentRead.map((item) => row(item, t('recentRead'), item.lastReadAt)))
              : h('p', { className: 'dshEndnoteCfg_hint' }, t('dashEmpty'))),
        view === 'read' ? null : h('h4', { className: 'dshEndnoteCfg_dashH4' }, t('recentAdded')),
        view === 'read'
          ? null
          : (recentAdded.length
              ? h('ul', { className: 'dshEndnoteCfg_dashList' }, recentAdded.map((item) => row(item, t('recentAdded'), item.addedAt)))
              : h('p', { className: 'dshEndnoteCfg_hint' }, t('dashAddedEmpty'))),
      )
    }

    /** 注册「插件页 → dsh-endnote 行 → 配置」页；任一依赖服务缺失时只降级本页。 */
    function registerSettingsPage(ctx) {
      if (!React) return
      const get = typeof ctx.get === 'function' ? (name) => ctx.get(name) : () => undefined
      const slots = get('slots')
      const locale = get('locale')
      const configForms = get('configForms')
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
        console.warn('[' + PLUGIN + '] 未找到 slots 服务，配置页不可用')
        return
      }
      if (!locale || typeof locale.register !== 'function') {
        console.warn('[' + PLUGIN + '] 未找到 locale 服务，配置页不可用')
        return
      }
      if (!configForms || typeof configForms.get !== 'function') {
        console.warn('[' + PLUGIN + '] 未找到 configForms 服务，配置页不可用')
        return
      }

      // ns 即 Loader entry id：优先用 describe() 里的实际命名空间，未就绪时按候选回退。
      // 注意 configForms.describe() 返回的是镜像对象（getSnapshot() 才有 view）。
      const pickScope = () => {
        let namespaces = []
        try {
          const mirror = typeof configForms.describe === 'function' ? configForms.describe() : null
          const mirrorSnap = mirror && typeof mirror.getSnapshot === 'function' ? mirror.getSnapshot() : null
          const list = mirrorSnap && mirrorSnap.view && mirrorSnap.view.namespaces
          if (Array.isArray(list)) namespaces = list
        } catch (error) {
          console.warn('[' + PLUGIN + '] 读取配置命名空间失败', error)
        }
        // 1) 精确匹配行 entry id（include:dsh-endnote）或包命名空间（dsh-endnote）。
        const exact = namespaces.find((row) => row && (row.ns === 'include:dsh-endnote' || row.ns === 'dsh-endnote'))
        if (exact) return configForms.get(exact.ns)
        // 2) 其它含 endnote 的命名空间。
        const fuzzy = namespaces.find((row) => row && typeof row.ns === 'string' && row.ns.indexOf('endnote') !== -1)
        if (fuzzy) return configForms.get(fuzzy.ns)
        // 3) 镜像还没就绪：按候选 id 逐个试，跳过 unavailable 的那个。
        for (const candidate of ['include:dsh-endnote', 'dsh-endnote']) {
          try {
            const candidateScope = configForms.get(candidate)
            const snap = candidateScope && typeof candidateScope.getSnapshot === 'function' ? candidateScope.getSnapshot() : null
            if (snap && snap.status !== 'unavailable') return candidateScope
          } catch {
            // 试下一个候选
          }
        }
        return null
      }

      const scope = pickScope()
      if (!scope) {
        console.warn('[' + PLUGIN + '] 未找到可用的配置表单，配置页不可用')
        return
      }

      ctx.effect(() => locale.register(SETTINGS_NS, SETTINGS_TEXT))

      const pickDirectory = async () => {
        const workspace = get('uiWorkspace')
        if (!workspace || typeof workspace.pickDirectory !== 'function') return null
        try {
          return await workspace.pickDirectory()
        } catch (error) {
          console.warn('[' + PLUGIN + '] 打开目录选择器失败', error)
          return null
        }
      }

      /** 已注册到某 slot 的 id/key 列表（无 entriesOfSlot 时按空处理）。 */
      const slotIds = (name, prop) => {
        if (typeof slots.entriesOfSlot !== 'function') return []
        try {
          const entries = slots.entriesOfSlot(name)
          if (!Array.isArray(entries)) return []
          return entries
            .map((entry) => (entry && entry.options ? entry.options[prop] : undefined))
            .filter((value) => typeof value === 'string' && value.length > 0)
        } catch {
          return []
        }
      }
      const hasPanelRow = () => slotIds('sidebar.panellist', 'id').indexOf(PANEL_NAME) !== -1
      const hasPanelPage = () => slotIds('main', 'key').indexOf(PANEL_NAME) !== -1

      const registerPanelRow = () =>
        slots.inject('sidebar.panellist', () =>
          slots.register({
            name: 'sidebar.panellist',
            id: PANEL_NAME,
            order: 20,
            locale: SETTINGS_NS,
            label: PANEL_NAME,
          }, PanelIcon))
      const registerPanelPage = () =>
        slots.inject('main', () =>
          slots.register({
            name: 'main',
            key: PANEL_NAME,
            locale: SETTINGS_NS,
            inject: () => ({}),
          }, PanelPage))

      /** 侧栏入口补注册：客户端半边晚于页面加载就绪、或首轮注册失败时一键补上。 */
      const ensurePanelEntries = () => {
        try {
          if (!hasPanelRow()) registerPanelRow()
          if (!hasPanelPage()) registerPanelPage()
        } catch (error) {
          console.warn('[' + PLUGIN + '] 补注册侧栏入口失败', error)
        }
      }

      /** 切到本插件的面板页；layout 服务可能晚于本插件就绪，调用时再取。 */
      const selectPanel = () => {
        const layout = get('layout')
        if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_NAME)
      }

      /** 顶部「侧栏入口」行：显示状态 + 打开面板 / 固定到侧栏 / 重新加载页面。 */
      const SidebarEntryRow = (props) => {
        const h = React.createElement
        const t = typeof props.t === 'function' ? props.t : (key) => key
        const [, setTick] = React.useState(0)
        const present = hasPanelRow()
        const reload = () => {
          if (typeof window !== 'undefined' && window.location) window.location.reload()
        }
        const pin = () => {
          ensurePanelEntries()
          setTick((n) => n + 1)
          // slot 订阅刷新是异步的，等一拍再切到面板页。
          setTimeout(selectPanel, 0)
        }
        const actions = present
          ? [h('button', { key: 'open', className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnSm', type: 'button', onClick: selectPanel }, t('sidebarOpen'))]
          : [
              h('button', { key: 'pin', className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnSm', type: 'button', onClick: pin }, t('sidebarAdd')),
              h('button', { key: 'reload', className: 'dshEndnoteCfg_btn dshEndnoteCfg_btnSm', type: 'button', onClick: reload }, t('sidebarReload')),
            ]
        return h('div', { className: 'dshEndnoteCfg_sideRow' },
          h('span', { className: 'dshEndnoteCfg_sideLabel' }, t('sidebarTitle')),
          h('span', { className: 'dshEndnoteCfg_sideState' + (present ? '' : ' is-missing') }, present ? t('sidebarOn') : t('sidebarMissing')),
          ...actions,
          h('p', { className: 'dshEndnoteCfg_sideHint' }, t('sidebarHint')),
        )
      }

      /** 配置页（插件行 / 组合包页）：侧栏入口行 + 配置表单。 */
      const Page = (slotProps) =>
        React.createElement(React.Fragment, null,
          React.createElement(SidebarEntryRow, { t: slotProps && slotProps.t }),
          React.createElement(EndnoteSettings, Object.assign({}, slotProps, { scope, pickDirectory })),
        )

      // 侧栏「dsh-endnote」面板页：整页是滚动容器（main slot 的锚点 display:contents，
      // 本 div 直接成为 mainPanel 的 flex 子项，用 flex:1+min-height:0+overflow-y:auto
      // 自己滚动），内容限宽 960px，右侧滚动条可拖动查看下方配置表单。
      const PanelPage = (slotProps) => {
        const h = React.createElement
        const t = typeof slotProps.t === 'function' ? slotProps.t : (key) => key
        // 命名空间可能在本页打开后才就绪（插件从缺失恢复、行重建），
        // 每次渲染重新解析 scope，避免抓住注册时那个 unavailable 的旧 scope。
        const liveScope = pickScope() || scope
        return h('div', { className: 'dshEndnoteCfg_panel' },
          h('div', { className: 'dshEndnoteCfg_pageBody' },
            h('h2', { className: 'dshEndnoteCfg_heading' }, PANEL_NAME),
            h(SidebarEntryRow, { t }),
            h(EndnoteDashboard, { t }),
            h(EndnoteSettings, Object.assign({}, slotProps, { t, scope: liveScope, pickDirectory })),
          ),
        )
      }

      ctx.effect(() => {
        const offs = []
        /** 逐个注册：任一 slot 注册失败不连坐其它入口。 */
        const mount = (label, register) => {
          try {
            const off = register()
            if (typeof off === 'function') offs.push(off)
          } catch (error) {
            console.warn('[' + PLUGIN + '] 注册 ' + label + ' 失败', error)
          }
        }
        mount('plugins.row.config', () =>
          slots.inject('plugins.row.config', () =>
            slots.register({
              name: 'plugins.row.config',
              key: ROW_KEY,
              locale: SETTINGS_NS,
              inject: () => ({}),
            }, Page)))
        // 组合包页：描述与行之间直接渲染配置区（比行页更显眼，两处都注册）。
        mount('plugins.bundle.config', () =>
          slots.inject('plugins.bundle.config', () =>
            slots.register({
              name: 'plugins.bundle.config',
              key: BUNDLE_KEY,
              locale: SETTINGS_NS,
              inject: () => ({}),
            }, Page)))
        // 侧栏导航行 + 同名 main 面板页必须成对：点击行会 selectPanel(id)。
        mount('sidebar.panellist', registerPanelRow)
        mount('main', registerPanelPage)
        return () => {
          for (const off of offs) {
            try { off() } catch { /* 已随页面卸载 */ }
          }
        }
      })
    }


    // React 由浏览器模块表提供（官方模板同款用法）；加载失败只降级配置页。
    let React = null
    try {
      React = require('react')
    } catch (error) {
      console.warn('[' + PLUGIN + '] 加载 React 失败，配置页不可用', error)
    }

    /**
     * 构造会话作用域的文件资源地址。路径按段编码，Windows 盘符（C:）也能正确回解。
     * @param {string} sessionId
     * @param {string} filePath
     * @returns {string}
     */
    function fileAddress(sessionId, filePath) {
      const segments = String(filePath)
        .split(/[\\/]+/)
        .filter(Boolean)
        .map(encodeURIComponent)
      return 'dsh-resource://file/session/' + encodeURIComponent(sessionId) + '/' + segments.join('/')
    }

    /** @param {unknown} snapshot */
    function maxSeq(snapshot) {
      if (!snapshot || !Array.isArray(snapshot.entries)) return -1
      let max = -1
      for (const entry of snapshot.entries) {
        const event = entry && entry.event ? entry.event : entry
        if (event && typeof event.seq === 'number' && event.seq > max) max = event.seq
      }
      return max
    }

    return {
      inject: ['sidebarRight'],
      apply(ctx) {
        // 图形化配置页是可选贡献：用 ctx.inject 等待 slots/locale/configForms，
        // 任一缺失时只降级配置页，不影响下面的右侧栏 PDF 打开。
        try {
          if (typeof ctx.inject === 'function') {
            const handle = ctx.inject(['slots', 'locale', 'configForms'], (child) => {
              registerSettingsPage(child)
            })
            ctx.effect(() => () => {
              try {
                if (handle && typeof handle.dispose === 'function') handle.dispose()
                else if (typeof handle === 'function') handle()
              } catch (error) {
                console.warn('[' + PLUGIN + '] 配置页清理失败', error)
              }
            })
          } else {
            registerSettingsPage(ctx)
          }
        } catch (error) {
          console.warn('[' + PLUGIN + '] 配置页注册失败', error)
        }

        const sidebar = ctx.sidebarRight
        const sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : undefined
        if (!sidebar || typeof sidebar.openResource !== 'function') {
          console.warn('[' + PLUGIN + '] 未找到 sidebarRight 服务，右侧栏自动打开不可用')
          return
        }
        if (!sessions || typeof sessions.retain !== 'function') {
          console.warn('[' + PLUGIN + '] 未找到 sessions 服务，右侧栏自动打开不可用')
          return
        }

        let current = null
        let attaching = 0

        const release = () => {
          if (!current) return
          const { off, ref } = current
          current = null
          try {
            if (typeof off === 'function') off()
          } catch (error) {
            console.warn('[' + PLUGIN + '] 退订会话事件失败', error)
          }
          try {
            if (ref && typeof ref.release === 'function') ref.release()
          } catch (error) {
            console.warn('[' + PLUGIN + '] 释放会话引用失败', error)
          }
        }

        const open = (sessionId, filePath) => {
          const address = fileAddress(sessionId, filePath)
          try {
            sidebar.openResource(address)
          } catch (error) {
            // 地址无人认领（宿主没有 PDF 预览、或页面不在 loopback 前端）时只告警，
            // 工具结果里的本地路径仍然可用。
            console.warn('[' + PLUGIN + '] 在右侧栏打开失败: ' + address, error)
          }
        }

        const consume = () => {
          if (!current || !current.source) return
          const snapshot = current.source.getSnapshot()
          if (!snapshot || !Array.isArray(snapshot.entries)) return
          for (const entry of snapshot.entries) {
            const event = entry && entry.event ? entry.event : entry
            if (!event || typeof event.seq !== 'number') continue
            if (event.seq <= current.cursor) continue
            current.cursor = event.seq
            if (event.type !== TOOL_RESULT) continue
            if (typeof event.time === 'number' && event.time < current.attachedAt) continue
            const meta = event.data && event.data.meta
            if (!meta || meta.plugin !== PLUGIN || meta.open !== true) continue
            if (typeof meta.path !== 'string' || !meta.path) continue
            open(current.sessionId, meta.path)
          }
        }

        const attach = async (sessionId) => {
          const token = (attaching += 1)
          release()
          if (!sessionId) return
          let ref
          try {
            ref = sessions.retain(sessionId, { source: SOURCE })
          } catch (error) {
            console.warn('[' + PLUGIN + '] 无法保留会话 ' + sessionId, error)
            return
          }
          current = {
            sessionId,
            ref,
            source: null,
            cursor: -1,
            attachedAt: Date.now(),
          }
          try {
            const binding = ref.binding || (ref.ready ? await ref.ready : undefined)
            const source = binding && binding.eventSource
            if (!source || typeof source.subscribe !== 'function') {
              if (token === attaching) release()
              return
            }
            if (token !== attaching || !current) {
              if (typeof ref.release === 'function') ref.release()
              return
            }
            current.source = source
            // 先记下窗口里已有的最大 seq 作为基线（历史事件不触发打开），再开始订阅，
            // 配合 attachedAt 时间过滤，重放/整体替换的历史都不会被误开。
            current.cursor = maxSeq(source.getSnapshot())
            current.off = source.subscribe(consume)
            consume()
          } catch (error) {
            console.warn('[' + PLUGIN + '] 订阅会话事件失败', error)
            if (token === attaching) release()
          }
        }

        ctx.effect(() => {
          const mounted = sidebar.mounted
          let last
          const sync = () => {
            const sessionId = mounted && typeof mounted.getSnapshot === 'function' ? mounted.getSnapshot() : undefined
            if (sessionId === last) return
            last = sessionId
            attach(sessionId)
          }
          const off = mounted && typeof mounted.subscribe === 'function' ? mounted.subscribe(sync) : undefined
          sync()
          return () => {
            try {
              if (typeof off === 'function') off()
            } catch (error) {
              console.warn('[' + PLUGIN + '] 退订会话切换失败', error)
            }
            release()
          }
        })
      },
    }
  },
})
