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


    // ==================================================================
    // 右侧栏 PDF 编辑器（documentPreviews 扩展）
    //
    // 用 documentPreviews.register 注册一个 .pdf 渲染器，priority=extension
    // 抢在内置只读预览之前；内容走 bytes-complete，由宿主直接把 PDF 字节
    // 交给本组件。PDF.js 与其 worker/cmaps/字体/wasm 全部来自插件自带的
    // vendor/pdfjs（经 webServer 同源路由），不访问 CDN、不依赖构建步骤。
    //
    // 标注只写插件 dataDir 下的侧车 JSON（EndNote 库严格只读），坐标是
    // 相对页面的 0..1 归一化矩形，缩放不影响落点。
    // ==================================================================
    const PDF_EDITOR_ID = 'dsh-endnote/pdf'
    const PDF_NS = 'dsh-endnote.pdf'
    const PDF_VENDOR = '/dsh-endnote/vendor/pdfjs/'
    const PDF_API = '/dsh-endnote/pdf-annotations'
    const PDF_EXPORT = '/dsh-endnote/export-pdf'
    // 高亮默认浅绿，方框默认红；两者都能在设置里改。
    // 预设颜色：绿、红，第 3 个取色器（彩色）。
    const PDF_PRESET_COLORS = ['#8ce99a', '#e03131']
    const PDF_DEFAULT_HIGHLIGHT = '#8ce99a'
    const PDF_BOX_RED = '#e03131'

    const PDF_TEXT = {
      zh: {
        title: 'EndNote PDF（可标注）',
        loading: '正在载入 PDF…',
        openFailed: '无法打开 PDF：',
        pages: '页',
        fit: '适应宽度',
        zoomIn: '放大',
        zoomOut: '缩小',
        select: '选择',
        highlight: '高亮',
        underline: '下划线',
        strike: '删除线',
        rect: '方框',
        text: '文字',
        undo: '撤销',
        remove: '删除',
        save: '保存',
        saving: '保存中…',
        export: '导出 PDF',
        exporting: '正在生成带注释副本…',
        exported: '已导出：',
        exportFailed: '导出失败：',
        openFolder: '打开文件夹',
        saved: '已保存',
        loadFailed: '读取标注失败：',
        saveFailed: '保存标注失败：',
        noPath: '无法从资源地址解析 PDF 路径，标注不可用。',
        empty: '选择文字后点「高亮」，或用「方框」在页面上拖出标注框。',
        notePlaceholder: '在此输入标注…',
        noteDone: '完成',
        cleared: '已删除标注',
        hint: '提示：拖选文字后点颜色即高亮；右键可直接高亮或删除已有标注；「高亮」工具拖选即落色。方框默认红色细边，画完可在框内输入，选中后拖动可移动、拉角可缩放。按住空格变抓手拖动画布；Ctrl+F 查找，Ctrl+滚轮缩放，「导出 PDF」写成原生注释。',
        prevPage: '上一页',
        nextPage: '下一页',
        copy: '复制',
        editNote: '编辑文字',
        removeAnnotation: '删除标注',
        highlightColorLabel: '高亮颜色',
        boxColorLabel: '方框颜色',
        hintToggle: '提示',
        listToggle: '列表',
        listTitle: '标注',
        hideList: '隐藏标注列表',
        settings: '设置',
        zoomLabel: '缩放',
        fontSizeLabel: '标注字号',
        sizeSmall: '小',
        sizeNormal: '标准',
        sizeLarge: '大',
        customColor: '自定义',
        noteColorLabel: '标注文字颜色',
        showSavedLabel: '显示已保存提示',
        boxFillLabel: '方框填充',
        fillNone: '无',
        fillLight: '淡',
        fillMedium: '中',
        marksToggle: '标注',
        find: '查找',
        findPlaceholder: '在 PDF 中查找…',
        findNext: '下一个',
        findPrev: '上一个',
        findNone: '无匹配',
        findIndexing: '正在索引文本…',
        findCount: '匹配',
      },
      en: {
        title: 'EndNote PDF (annotatable)',
        loading: 'Loading PDF…',
        openFailed: 'Cannot open PDF: ',
        pages: 'pages',
        fit: 'Fit width',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        select: 'Select',
        highlight: 'Highlight',
        underline: 'Underline',
        strike: 'Strikeout',
        rect: 'Box',
        text: 'Text',
        undo: 'Undo',
        remove: 'Delete',
        save: 'Save',
        saving: 'Saving…',
        export: 'Export PDF',
        exporting: 'Writing annotated copy…',
        exported: 'Exported: ',
        exportFailed: 'Export failed: ',
        openFolder: 'Open folder',
        saved: 'Saved',
        loadFailed: 'Could not load annotations: ',
        saveFailed: 'Could not save annotations: ',
        noPath: 'The PDF path could not be resolved from the resource address; annotations are unavailable.',
        empty: 'Select text and click Highlight, or use Box and drag on the page.',
        notePlaceholder: 'Type a note…',
        noteDone: 'Done',
        cleared: 'Annotation removed',
        hint: 'Tip: drag-select text then pick a colour, or right-click to highlight or remove an annotation. With the Highlight tool, releasing the drag highlights immediately. Boxes are thin red by default: type inside, drag to move, pull a corner to resize. Hold Space to pan. Ctrl+F to find, Ctrl+wheel to zoom.',
        prevPage: 'Previous page',
        nextPage: 'Next page',
        copy: 'Copy',
        editNote: 'Edit text',
        removeAnnotation: 'Remove annotation',
        highlightColorLabel: 'Highlight colour',
        boxColorLabel: 'Box colour',
        hintToggle: 'Tips',
        listToggle: 'List',
        listTitle: 'Annotations',
        hideList: 'Hide annotation list',
        settings: 'Settings',
        zoomLabel: 'Zoom',
        fontSizeLabel: 'Note text size',
        sizeSmall: 'S',
        sizeNormal: 'M',
        sizeLarge: 'L',
        customColor: 'Custom',
        noteColorLabel: 'Note text colour',
        showSavedLabel: 'Show saved status',
        boxFillLabel: 'Box fill',
        fillNone: 'None',
        fillLight: 'Light',
        fillMedium: 'Medium',
        marksToggle: 'Marks',
        find: 'Find',
        findPlaceholder: 'Find in PDF…',
        findNext: 'Next match',
        findPrev: 'Previous match',
        findNone: 'No matches',
        findIndexing: 'Indexing text…',
        findCount: 'matches',
      },
    }

    /** 渲染颜色选择器：2 预设色（绿/红）+ 取色器。 */
    function createColorPicker(current, onChange) {
      return h('span', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
        PDF_PRESET_COLORS.map((entry) => h('button', {
          key: 'cp-' + entry,
          type: 'button',
          className: 'dshEndnotePdf_dot',
          title: entry,
          'data-active': current === entry,
          style: { background: entry },
          onClick: () => onChange(entry),
        })),
        h('label', {
          className: 'dshEndnotePdf_dot dshEndnotePdf_pickerLabel',
          title: 'custom',
          style: {
            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          },
        },
          h('input', {
            type: 'color',
            className: 'dshEndnotePdf_pickerInput',
            value: current,
            onChange: (event) => onChange(event.currentTarget.value),
          }),
        ),
      )
    }

    const PDF_CSS = [
      '.dshEndnotePdf_root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-secondary,#f6f7f9);}',
      '.dshEndnotePdf_bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-secondary,#e3e5e8);background:var(--dsw-alias-bg-primary,#fff);flex:0 0 auto;}',
      '.dshEndnotePdf_btn{font:inherit;font-size:12px;line-height:1.4;padding:3px 8px;border:1px solid var(--dsw-alias-border-secondary,#dcdfe4);border-radius:6px;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-text-primary,#1f2329);cursor:pointer;}',
      '.dshEndnotePdf_btn:hover:not(:disabled){border-color:var(--dsw-alias-border-hover,#9aa4b2);}',
      '.dshEndnotePdf_btn:disabled{opacity:.45;cursor:default;}',
      '.dshEndnotePdf_btn[data-active=true]{background:var(--dsw-alias-bg-selected,#e8f0ff);border-color:var(--dsw-alias-border-selected,#3b82f6);}',
      '.dshEndnotePdf_btn[data-off=true]{opacity:.42;}',
      '.dshEndnotePdf_icon{display:block;pointer-events:none;}',
      '.dshEndnotePdf_btn[data-icon=true]{padding:3px 6px;line-height:0;}',
      '.dshEndnotePdf_sep{width:1px;height:16px;background:var(--dsw-alias-border-secondary,#e3e5e8);margin:0 2px;}',
      '.dshEndnotePdf_meta{font-size:12px;color:var(--dsw-alias-text-secondary,#646a73);}',
      '.dshEndnotePdf_dot{width:16px;height:16px;border-radius:50%;border:1px solid rgba(0,0,0,.15);cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;position:relative;overflow:hidden}',
      '.dshEndnotePdf_dot[data-active=true]{outline:2px solid var(--dsw-alias-border-selected,#3b82f6);outline-offset:1px;}',
      '.dshEndnotePdf_pickerLabel{cursor:pointer;}',
      '.dshEndnotePdf_pickerLabel .dshEndnotePdf_pickerInput{position:absolute;width:20px;height:20px;opacity:0;cursor:pointer;top:0;left:0;}',
      '.dshEndnotePdf_settingCheck{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;color:var(--dsw-alias-label-primary)}',
      '.dshEndnotePdf_scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:16px 16px 40px;}',
      '.dshEndnotePdf_page{position:relative;margin:0 auto 18px;background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.14);}',
      '.dshEndnotePdf_canvas{display:block;width:100%;height:100%;}',
      '.dshEndnotePdf_text{position:absolute;inset:0;overflow:hidden;line-height:1;opacity:1;}',
      '.dshEndnotePdf_text span{position:absolute;color:transparent;white-space:pre;transform-origin:0 0;cursor:text;}',
      '.dshEndnotePdf_text span::selection{background:rgba(59,130,246,.25);color:transparent;}',
      // 标注层整层铺满页面：必须让鼠标穿透，否则文本层收不到按下事件，
      // 拖选变不成选区（表现就是“选不中字、也就没有浮条和拖选高亮”）。
      // 单个方框再单独把事件收回来，保留点选与双击编辑。
      '.dshEndnotePdf_marks{position:absolute;inset:0;pointer-events:none;}',
      '.dshEndnotePdf_hl{position:absolute;border-radius:1px;mix-blend-mode:multiply;pointer-events:none;}',
      '.dshEndnotePdf_line{position:absolute;height:0;pointer-events:none;}',
      '.dshEndnotePdf_page[data-tool="rect"],.dshEndnotePdf_page[data-tool="text"]{cursor:crosshair;}',
      // 空格抓手：按下空格后页面变抓手，拖拽平移画布；松开恢复箭头。
      '.dshEndnotePdf_page[data-tool="pan"]{cursor:grab;}',
      '.dshEndnotePdf_page[data-tool="pan"][data-panning="true"]{cursor:grabbing;}',
      '.dshEndnotePdf_page[data-tool="pan"] .dshEndnotePdf_text{user-select:none;}',
      '.dshEndnotePdf_page[data-tool="rect"] .dshEndnotePdf_text,.dshEndnotePdf_page[data-tool="text"] .dshEndnotePdf_text{pointer-events:none;user-select:none;}',
      '.dshEndnotePdf_list{max-height:156px;overflow:auto;border-bottom:1px solid var(--dsw-alias-border-secondary,#e3e5e8);background:var(--dsw-alias-bg-primary,#fff);flex:0 0 auto;}',
      '.dshEndnotePdf_listHead{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:2px 6px 2px 10px;border-bottom:1px solid var(--dsw-alias-border-secondary,#eef0f2);background:var(--dsw-alias-bg-primary,#fff);font-size:11px;color:var(--dsw-alias-text-secondary,#646a73);}',
      '.dshEndnotePdf_listHide{font:inherit;font-size:13px;line-height:1;padding:2px 5px;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-text-secondary,#646a73);cursor:pointer;}',
      '.dshEndnotePdf_listHide:hover{background:var(--dsw-alias-bg-hover,#f2f4f7);color:var(--dsw-alias-text-primary,#1f2329);}',
      '.dshEndnotePdf_row{display:flex;align-items:center;gap:6px;padding:3px 10px;font-size:12px;cursor:pointer;}',
      '.dshEndnotePdf_row:hover{background:var(--dsw-alias-bg-hover,#f2f4f7);}',
      '.dshEndnotePdf_row[data-active=true]{background:var(--dsw-alias-bg-selected,#e8f0ff);}',
      '.dshEndnotePdf_rowText{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-text-primary,#1f2329);}',
      '.dshEndnotePdf_rowMeta{color:var(--dsw-alias-text-secondary,#646a73);flex:0 0 auto;}',
      '.dshEndnotePdf_group{position:absolute;pointer-events:none;}',
      // 方框改成知云/ Acrobat 那种细边、直角、几乎不填充的观感；颜色由行内 borderColor 给。
      '.dshEndnotePdf_box{position:absolute;inset:0;box-sizing:border-box;border:1.5px solid;border-radius:0;cursor:pointer;overflow:hidden;pointer-events:auto;}',
      '.dshEndnotePdf_badge{position:absolute;z-index:4;top:-8px;left:-8px;min-width:16px;height:16px;box-sizing:border-box;padding:0 4px;border-radius:8px;color:#fff;font-size:10px;line-height:16px;text-align:center;pointer-events:none;box-shadow:0 1px 2px rgba(15,23,42,.28);}',
      // 无填充时靠白色描边保证字在正文上也读得清。
      '.dshEndnotePdf_boxText{position:absolute;inset:0;padding:3px 4px;font-size:11px;line-height:1.35;overflow:hidden;word-break:break-word;color:#111;white-space:pre-wrap;text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff;}',
      '.dshEndnotePdf_sel{outline:2px dashed var(--dsw-alias-border-selected,#3b82f6);outline-offset:1px;}',
      // 选中方框的缩放据点：单独一层，不放在 overflow:hidden 的方框里。
      '.dshEndnotePdf_handle{position:absolute;width:9px;height:9px;margin:-5px 0 0 -5px;border:1px solid #fff;border-radius:2px;background:#3b82f6;box-shadow:0 1px 2px rgba(15,23,42,.35);pointer-events:auto;z-index:3;}',
      '.dshEndnotePdf_handle[data-corner=nw],.dshEndnotePdf_handle[data-corner=se]{cursor:nwse-resize;}',
      '.dshEndnotePdf_handle[data-corner=ne],.dshEndnotePdf_handle[data-corner=sw]{cursor:nesw-resize;}',
      '.dshEndnotePdf_handle[data-corner=n],.dshEndnotePdf_handle[data-corner=s]{cursor:ns-resize;}',
      '.dshEndnotePdf_handle[data-corner=e],.dshEndnotePdf_handle[data-corner=w]{cursor:ew-resize;}',
      '.dshEndnotePdf_box[data-movable=true]{cursor:move;}',
      // 查找命中：淡橙色铺底，当前命中用实心橙描边，和黄色高亮区分开。
      '.dshEndnotePdf_findLayer{position:absolute;inset:0;pointer-events:none;}',
      '.dshEndnotePdf_find{position:absolute;background:rgba(255,169,77,.38);border-radius:1px;pointer-events:none;}',
      '.dshEndnotePdf_find[data-active=true]{background:rgba(255,122,0,.55);outline:1px solid #f76707;}',
      '.dshEndnotePdf_findBar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:5px 10px;border-bottom:1px solid var(--dsw-alias-border-secondary,#e3e5e8);background:var(--dsw-alias-bg-primary,#fff);flex:0 0 auto;}',
      '.dshEndnotePdf_findBar input{flex:1 1 140px;min-width:90px;font:inherit;font-size:12px;padding:3px 7px;border:1px solid var(--dsw-alias-border-secondary,#dcdfe4);border-radius:6px;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-text-primary,#1f2329);}',
      '.dshEndnotePdf_rowDot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;box-shadow:inset 0 0 0 1px rgba(15,23,42,.16);}',
      // 设置弹层：缩放与字号收在这里，工具栏只留一个「设置」按钮。
      '.dshEndnotePdf_settingsWrap{position:relative;display:inline-flex;}',
      '.dshEndnotePdf_settings{position:absolute;right:0;top:calc(100% + 4px);z-index:40;min-width:236px;padding:6px;border:1px solid var(--dsw-alias-border-secondary,#dcdfe4);border-radius:8px;background:var(--dsw-alias-bg-primary,#fff);box-shadow:0 10px 26px rgba(15,23,42,.22);}',
      '.dshEndnotePdf_settingRow{display:flex;align-items:center;gap:4px;padding:3px 2px;}',
      '.dshEndnotePdf_settingRow+.dshEndnotePdf_settingRow{border-top:1px solid var(--dsw-alias-border-secondary,#eef0f2);}',
      '.dshEndnotePdf_settingLabel{flex:1 1 auto;font-size:12px;color:var(--dsw-alias-text-secondary,#646a73);white-space:nowrap;}',
      '.dshEndnotePdf_settingValue{min-width:40px;text-align:center;font-size:12px;color:var(--dsw-alias-text-secondary,#646a73);}',
      '.dshEndnotePdf_settingRow .dshEndnotePdf_btn{padding:2px 7px;}',
      '.dshEndnotePdf_draft{position:absolute;border:2px dashed #3b82f6;background:rgba(59,130,246,.12);pointer-events:none;}',
      '.dshEndnotePdf_float{position:absolute;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:4px;background:#1f2329;color:#fff;border-radius:8px;padding:4px;box-shadow:0 6px 18px rgba(15,23,42,.25);max-width:calc(100% - 8px);}',
      '.dshEndnotePdf_float button{font:inherit;font-size:12px;border:0;border-radius:5px;padding:3px 6px;background:transparent;color:#fff;cursor:pointer;}',
      '.dshEndnotePdf_float button:hover{background:rgba(255,255,255,.16);}',
      '.dshEndnotePdf_floatDot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(255,255,255,.55);cursor:pointer;padding:0;flex:0 0 auto;}',
      '.dshEndnotePdf_floatDot[data-active=true]{outline:2px solid #fff;outline-offset:1px;}',
      '.dshEndnotePdf_floatSep{width:1px;height:16px;background:rgba(255,255,255,.28);margin:0 2px;}',
      '.dshEndnotePdf_menu{position:fixed;z-index:60;min-width:172px;max-width:240px;padding:4px;background:var(--dsw-alias-bg-primary,#fff);border:1px solid var(--dsw-alias-border-secondary,#dcdfe4);border-radius:8px;box-shadow:0 10px 26px rgba(15,23,42,.22);}',
      '.dshEndnotePdf_menuTitle{padding:4px 8px 6px;font-size:11px;line-height:1.4;color:var(--dsw-alias-text-secondary,#646a73);max-height:2.8em;overflow:hidden;word-break:break-word;}',
      '.dshEndnotePdf_menuRow{display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;padding:5px 8px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-text-primary,#1f2329);font:inherit;font-size:12px;line-height:1.4;text-align:left;cursor:pointer;}',
      '.dshEndnotePdf_menuRow:hover{background:var(--dsw-alias-bg-hover,#f2f4f7);}',
      '.dshEndnotePdf_menuRow[data-danger=true]:hover{background:#fdeceb;}',
      '.dshEndnotePdf_menuRow[data-danger=true]{color:#d93026;}',
      '.dshEndnotePdf_menuRow[data-static=true]{cursor:default;}',
      '.dshEndnotePdf_menuRow[data-static=true]:hover{background:transparent;}',
      '.dshEndnotePdf_menuSep{height:1px;margin:3px 2px;background:var(--dsw-alias-border-secondary,#e3e5e8);}',
      '.dshEndnotePdf_note{position:absolute;z-index:6;inset:0;display:flex;flex-direction:column;background:rgba(255,255,255,.96);border:1px solid #3b82f6;border-radius:2px;}',
      '.dshEndnotePdf_note textarea{flex:1 1 auto;min-height:0;resize:none;border:0;outline:0;font:11px/1.4 inherit;padding:4px;background:transparent;color:#111;}',
      '.dshEndnotePdf_noteBar{display:flex;justify-content:flex-end;padding:2px;}',
      '.dshEndnotePdf_noteBar button{font:inherit;font-size:11px;padding:1px 6px;border:1px solid #c7ccd3;border-radius:4px;background:#fff;cursor:pointer;}',
      '.dshEndnotePdf_status{font-size:12px;color:var(--dsw-alias-text-secondary,#646a73);}',
      '.dshEndnotePdf_status[data-tone=error]{color:#d93026;}',
      '.dshEndnotePdf_status[data-tone=ok]{color:#2b8a3e;}',
      '.dshEndnotePdf_hint{font-size:12px;color:var(--dsw-alias-text-secondary,#646a73);padding:24px;text-align:center;}',
    ].join('\n')

    /** 注入一次 CSS（按 data-dsh-plugin 标记去重）。 */
    function ensurePdfCss() {
      if (typeof document === 'undefined') return
      if (document.querySelector('style[data-dsh-plugin="dsh-endnote-pdf"]') !== null) return
      const tag = document.createElement('style')
      tag.dataset.dshPlugin = 'dsh-endnote-pdf'
      tag.textContent = PDF_CSS
      document.head.appendChild(tag)
    }

    /** 懒加载插件自带的 PDF.js；worker 指向同源静态路由。 */
    let pdfjsPromise = null
    function loadPdfjs() {
      if (pdfjsPromise === null) {
        const origin = typeof location === 'undefined' ? '' : location.origin
        const base = new URL(PDF_VENDOR, origin + '/').href
        // polyfills 先于 PDF.js 求值：旧 Chromium 缺 toHex / getOrInsertComputed。
        pdfjsPromise = import(/* @vite-ignore */ base + 'build/polyfills.js?v=8')
          .catch(() => undefined)
          .then(() => import(/* @vite-ignore */ base + 'build/pdf.min.mjs?v=8'))
          .then((pdfjs) => {
            pdfjs.GlobalWorkerOptions.workerSrc = base + 'build/pdf.worker.min.mjs?v=8'
            return pdfjs
          })
      }
      return pdfjsPromise
    }

    /**
     * 从 dsh-resource:// 地址还原 PDF 绝对路径（按段解码，兼容 Windows 盘符）。
     * @param {string} address
     * @returns {string}
     */
    function pdfPathFromAddress(address) {
      const match = /^dsh-resource:\/\/file\/(?:session|workspace)\/([^/]+)\/(.+)$/.exec(String(address || ''))
      if (!match) return ''
      try {
        return match[2].split('/').filter(Boolean).map(decodeURIComponent).join('/')
      } catch {
        return ''
      }
    }

    /** 侧车键要求绝对路径；Windows 盘符、POSIX 根与 UNC 都算。 */
    function isAbsolutePdfPath(path) {
      const text = String(path || '')
      return /^[a-zA-Z]:[\\/]/.test(text) || text.startsWith('/') || text.startsWith('\\\\')
    }

    /** 把一段文字写入侧车；返回解析后的响应。 */
    async function fetchAnnotations(pdfPath) {
      const response = await fetch(PDF_API + '?path=' + encodeURIComponent(pdfPath), { credentials: 'same-origin' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data || data.ok !== true) {
        throw new Error((data && data.error) || ('HTTP ' + response.status))
      }
      return data
    }

    /** 保存一份 PDF 的标注；返回 { count, updatedAt }。 */
    async function saveAnnotations(pdfPath, annotations) {
      const response = await fetch(PDF_API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: pdfPath, annotations }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data || data.ok !== true) {
        throw new Error((data && data.error) || ('HTTP ' + response.status))
      }
      return data
    }

    /** 一页的文本层：绝对定位 span，透明文字用于选择与 Range 测量。 */
    function buildTextLayer(host, pdfjs, textContent, viewport) {
      host.textContent = ''
      const spans = []
      for (const item of textContent.items) {
        if (!item || typeof item.str !== 'string' || item.str === '' || !item.transform) continue
        const tx = pdfjs.Util.transform(viewport.transform, item.transform)
        const fontHeight = Math.hypot(tx[2], tx[3])
        if (!Number.isFinite(fontHeight) || fontHeight <= 0) continue
        const span = document.createElement('span')
        span.textContent = item.str
        span.style.left = tx[4] + 'px'
        span.style.top = (tx[5] - fontHeight) + 'px'
        span.style.fontSize = fontHeight + 'px'
        span.style.fontFamily = 'sans-serif'
        span.dataset.width = String(item.width || 0)
        host.appendChild(span)
        spans.push({ span, item })
      }
      // 先把所有 span 放进 DOM 再测量：宽度按 PDF 报告的 item.width 拉伸。
      for (const entry of spans) {
        const measured = entry.span.getBoundingClientRect().width
        const target = entry.item.width * viewport.scale
        if (measured > 0 && target > 0) {
          entry.span.style.transform = 'scaleX(' + (target / measured).toFixed(4) + ')'
        }
      }
    }

    /** 归一化矩形夹到 0..1。 */
    function clampUnit(value) {
      return Math.min(1, Math.max(0, value))
    }

    /**
     * 选区 → 每行一个矩形（页面归一化坐标）。
     *
     * 浏览器会把一次拖选拆成很多 span 碎片，直接当矩形用会出现 1px 缝隙、
     * 同一行高低不齐。这里按行合并成连续色带，与 Zotero / Acrobat 的高亮一致：
     * 上下沿对齐、行间不重叠、跨词不断裂。
     *
     * @param {Range} range
     * @param {DOMRect} base 页面元素的位置与尺寸
     * @returns {number[][]} `[x, y, w, h]` 数组，0..1
     */
    function selectionRects(range, base) {
      const raw = []
      for (const rect of range.getClientRects()) {
        if (rect.width < 0.5 || rect.height < 0.5) continue
        const left = rect.left - base.left
        const top = rect.top - base.top
        if (left > base.width + 2 || top > base.height + 2) continue
        raw.push({ left, top, right: left + rect.width, bottom: top + rect.height })
      }
      raw.sort((a, b) => (a.top - b.top) || (a.left - b.left))
      const rows = []
      for (const rect of raw) {
        const row = rows[rows.length - 1]
        const overlap = row
          ? Math.min(row.bottom, rect.bottom) - Math.max(row.top, rect.top)
          : 0
        const shorter = row ? Math.min(row.bottom - row.top, rect.bottom - rect.top) : 0
        if (row && overlap > shorter * 0.5) {
          row.top = Math.min(row.top, rect.top)
          row.bottom = Math.max(row.bottom, rect.bottom)
          row.left = Math.min(row.left, rect.left)
          row.right = Math.max(row.right, rect.right)
        } else {
          rows.push({ ...rect })
        }
      }
      return rows.map((row) => [
        clampUnit(row.left / base.width),
        clampUnit(row.top / base.height),
        clampUnit((row.right - row.left) / base.width),
        clampUnit((row.bottom - row.top) / base.height),
      ])
    }

    /** 面板显示偏好（提示行 / 标注列表 / 页面上是否画标注 / 标注字号）存在 localStorage。 */
    const PDF_UI_KEY = 'dsh-endnote:pdf-ui'
    const FONT_SCALES = [0.85, 1, 1.25, 1.5]
    // 方框内部填充：默认 0（完全不填充，只留细红边）。
    const BOX_FILLS = [0, 0.08, 0.16]
    const FONT_SIZE_LABELS = ['sizeSmall', 'sizeNormal', 'sizeLarge', 'sizeHuge']
    const BOX_FILL_LABELS = ['fillNone', 'fillLight', 'fillMedium']
    function readUiPrefs() {
      try {
        const raw = globalThis.localStorage && globalThis.localStorage.getItem(PDF_UI_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        const scale = parsed && typeof parsed.fontScale === 'number' ? parsed.fontScale : 1
        const fill = parsed && typeof parsed.boxFill === 'number' ? parsed.boxFill : 0
        return {
          hint: !parsed || parsed.hint !== false,
          list: !parsed || parsed.list !== false,
          marks: !parsed || parsed.marks !== false,
          showSaved: !parsed || parsed.showSaved !== false,
          fontScale: FONT_SCALES.indexOf(scale) !== -1 ? scale : 1,
          boxFill: BOX_FILLS.indexOf(fill) !== -1 ? fill : 0,
          highlightColor: isValidColor(parsed && parsed.highlightColor) ? parsed.highlightColor : PDF_DEFAULT_HIGHLIGHT,
          boxColor: isValidColor(parsed && parsed.boxColor) ? parsed.boxColor : PDF_BOX_RED,
          noteColor: isValidColor(parsed && parsed.noteColor) ? parsed.noteColor : '#333333',
          extraColors: Array.isArray(parsed && parsed.extraColors) ? parsed.extraColors : [],
        }
      } catch {
        return {
          hint: true, list: true, marks: true, showSaved: true, fontScale: 1, boxFill: 0,
          highlightColor: PDF_DEFAULT_HIGHLIGHT, boxColor: PDF_BOX_RED, noteColor: '#333333', extraColors: [],
        }
      }
    }
    function writeUiPrefs(prefs) {
      try {
        if (globalThis.localStorage) globalThis.localStorage.setItem(PDF_UI_KEY, JSON.stringify(prefs))
      } catch { /* 存储不可用，只影响记忆 */ }
    }

    /** 校验颜色值是否为有效的十六进制色。 */
    function isValidColor(value) {
      return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    }

    /** 两个归一化矩形是否有实际重叠（忽略碰边的 1px 误差）。 */
    function rectsOverlap(a, b) {
      const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])
      const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])
      return w > 0.0005 && h > 0.0005
    }

    /** 查找用归一化：去掉所有空白并小写，中英文都能用同一套比对。 */
    function normalizeFindText(text) {
      return String(text || '').replace(/\s+/g, '').toLowerCase()
    }

    /**
     * 把整份文档的文本层压成「无空白字符串 + 每个字符来自哪个文本片段」。
     * 查找时按字符区间反查矩形，不用每次重新解析页面。
     *
     * @param {any} doc PDF.js 文档
     * @returns {Promise<Array<{ text: string, chars: Array<{ ch: string, box: number }>, boxes: number[][] }>>}
     */
    async function buildFindIndex(doc) {
      const pdfjs = await loadPdfjs()
      const pages = []
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1 })
        const content = await page.getTextContent()
        const boxes = []
        const chars = []
        for (const item of content.items) {
          if (!item || typeof item.str !== 'string' || item.str === '' || !item.transform) continue
          const tx = pdfjs.Util.transform(viewport.transform, item.transform)
          const fontHeight = Math.hypot(tx[2], tx[3])
          const width = Number(item.width) || 0
          if (!(fontHeight > 0) || !(width > 0)) continue
          const boxIndex = boxes.push([
            clampUnit(tx[4] / viewport.width),
            clampUnit((tx[5] - fontHeight) / viewport.height),
            clampUnit(width / viewport.width),
            clampUnit(fontHeight / viewport.height),
          ]) - 1
          for (const ch of item.str) {
            if (/\s/.test(ch)) continue
            chars.push({ ch: ch.toLowerCase(), box: boxIndex })
          }
        }
        pages.push({ text: chars.map((entry) => entry.ch).join(''), chars, boxes })
        if (typeof page.cleanup === 'function') page.cleanup()
      }
      return pages
    }

    /**
     * 在文本索引里找全部命中；每条命中带上覆盖到的文本片段矩形。
     * 上限 800 条：再多的命中对阅读没有意义，反而会拖慢渲染。
     */
    function collectFindMatches(pages, query) {
      const needle = normalizeFindText(query)
      const matches = []
      if (!needle) return matches
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const page = pages[pageIndex]
        let from = 0
        for (;;) {
          if (matches.length >= 800) return matches
          const at = page.text.indexOf(needle, from)
          if (at === -1) break
          const boxes = []
          for (let i = at; i < at + needle.length; i += 1) {
            const entry = page.chars[i]
            if (!entry || boxes.indexOf(entry.box) !== -1) continue
            boxes.push(entry.box)
          }
          if (boxes.length > 0) {
            matches.push({
              page: pageIndex + 1,
              rects: boxes.map((boxIndex) => page.boxes[boxIndex].slice()),
            })
          }
          from = at + Math.max(1, needle.length)
        }
      }
      return matches
    }

    /**
     * 工具栏图标（统一的 15px 线性图标）。工具栏上信息密度高，用图标替掉
     * 文字标签能省一半宽度，悬停仍有 title/aria-label。
     */
    const PDF_ICONS = {
      prev: [['path', { d: 'M14 5l-6 7 6 7' }]],
      next: [['path', { d: 'M10 5l6 7-6 7' }]],
      select: [['path', { d: 'M6 3l13 8-5.6 1.2L16 19l-2.1.9-2.4-6.7L6 16z' }]],
      highlight: [['path', { d: 'M4 20h7M9.5 16.5l-3-3 7.5-7.5 3 3-7.5 7.5z' }]],
      rect: [['rect', { x: 4, y: 6, width: 16, height: 12, rx: 1 }]],
      text: [['path', { d: 'M5 6h14M12 6v13M9 19h6' }]],
      undo: [['path', { d: 'M9 7L4 12l5 5M4 12h9a6 6 0 016 6' }]],
      trash: [['path', { d: 'M4 7h16M10 4h4v3h-4zM6 7l1 13h10l1-13M10 11v6M14 11v6' }]],
      find: [['circle', { cx: 10.5, cy: 10.5, r: 5.5 }], ['path', { d: 'M15 15l4.5 4.5' }]],
      gear: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1' }]],
      info: [['circle', { cx: 12, cy: 12, r: 8 }], ['path', { d: 'M12 11v6M12 8h.01' }]],
      list: [['path', { d: 'M4 7h16M4 12h16M4 17h10' }]],
      tag: [['path', { d: 'M4 11V5h6l9 9-6 6-9-9zM8 8h.01' }]],
    }

    function pdfIcon(name) {
      const parts = PDF_ICONS[name] || []
      return React.createElement('svg', {
        className: 'dshEndnotePdf_icon',
        viewBox: '0 0 24 24',
        width: 15,
        height: 15,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }, parts.map((part, index) => React.createElement(part[0], { key: index, ...part[1] })))
    }

    /** 复制到剪贴板；无权限时静默失败，不影响标注。 */
    function copyText(text) {
      if (!text) return
      try { void navigator.clipboard.writeText(String(text)) } catch { /* 无剪贴板权限 */ }
    }

    /**
     * 单个 PDF 页面：canvas + 文本层 + 标注层。
     * 文本选择、高亮、方框、框内文字都在这一层完成。
     */
    function PdfPageView(props) {
      const h = React.createElement
      const t = props.t
      const { doc, pageNumber, width, tool, color, annotations, selectedId, hideMarks, active, pageHeight } = props
      const findMarks = props.findMarks || []
      const boxFill = props.boxFill || 0
      // 标注字号跟随页面宽度（缩放不糊），再乘用户选的字号档位。
      const noteFontSize = Math.max(9, Math.min(26, Math.round(width * 0.018 * (props.fontScale || 1))))
      const hostRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const textRef = React.useRef(null)
      const [dims, setDims] = React.useState(null)
      const [draftRect, setDraftRect] = React.useState(null)
      const [editing, setEditing] = React.useState(null)
      const [floatBar, setFloatBar] = React.useState(null)
      const [menu, setMenu] = React.useState(null)
      const dragRef = React.useRef(null)
      const draftRef = React.useRef(null)
      const rightRef = React.useRef(null)
      const moveRef = React.useRef(null)
      const panRef = React.useRef(null)
      const noteRef = React.useRef(null)
      const [panning, setPanning] = React.useState(false)
      // Esc 丢弃时不要再用 blur 事件把旧文字提交回去。
      const discardRef = React.useRef(false)

      React.useEffect(() => {
        let live = true
        let proxy = null
        let task = null
        // 宽度还没量出来时不渲染：0 宽度会先画一次，随后宽度到位又抢同一个
        // canvas，PDF.js 会直接抛「same canvas during multiple render()」。
        if (!doc || !(width > 0) || active === false) return undefined
        ;(async () => {
          try {
            const pdfjs = await loadPdfjs()
            proxy = await doc.getPage(pageNumber)
            if (!live) return
            const base = proxy.getViewport({ scale: 1 })
            const scale = width / base.width
            const viewport = proxy.getViewport({ scale })
            const canvas = canvasRef.current
            const textHost = textRef.current
            if (!canvas || !textHost) return
            const dpr = Math.min(2, globalThis.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(viewport.width * dpr))
            canvas.height = Math.max(1, Math.round(viewport.height * dpr))
            const context = canvas.getContext('2d')
            if (!context) throw new Error('2D canvas unavailable')
            context.setTransform(dpr, 0, 0, dpr, 0, 0)
            // 尺寸先定：页面高度是所有标注定位的基准，不能等渲染。
            setDims({ width: viewport.width, height: viewport.height })
            task = proxy.render({ canvasContext: context, viewport, canvas })
            // 不等 render 完成：窗口被遮挡/后台时浏览器会暂停 rAF，
            // pdf.js 的渲染循环随之挂起，promise 永远不 resolve。
            // 让它自己跑，失败再报错，文本层与交互不必被它拖住。
            void task.promise
              .then(() => { task = null })
              .catch((error) => {
                task = null
                const name = error && error.name ? String(error.name) : ''
                if (name === 'RenderingCancelledException') return
                if (live && props.onError) props.onError(error)
              })
            const textContent = await Promise.race([
              proxy.getTextContent(),
              new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
            ])
            if (!live || !textContent) return
            buildTextLayer(textHost, pdfjs, textContent, viewport)
          } catch (error) {
            // 渲染被新一轮 effect 取消是正常路径（缩放/翻页），不是错误。
            const name = error && error.name ? String(error.name) : ''
            if (live && name !== 'RenderingCancelledException' && props.onError) props.onError(error)
          }
        })()
        return () => {
          live = false
          try { if (task) task.cancel() } catch { /* 已完成 */ }
          try { if (proxy) proxy.cleanup() } catch { /* 页面已释放 */ }
        }
      }, [doc, pageNumber, width, active])

      /** 指针坐标 → 页面归一化坐标。 */
      const pointOf = (event) => {
        const base = hostRef.current && hostRef.current.getBoundingClientRect()
        if (!base || base.width === 0 || base.height === 0) return null
        return {
          x: clampUnit((event.clientX - base.left) / base.width),
          y: clampUnit((event.clientY - base.top) / base.height),
        }
      }

      /**
       * 归一化坐标命中的标注。从后往前找：后创建的标注画在上面，
       * 重叠时应该命中最上层那条，而不是数组里的第一条。
       */
      const hitAt = (point) => {
        if (!point) return null
        for (let index = annotations.length - 1; index >= 0; index -= 1) {
          const annotation = annotations[index]
          const rects = annotation.rects || []
          for (const rect of rects) {
            if (point.x >= rect[0] && point.x <= rect[0] + rect[2] &&
              point.y >= rect[1] && point.y <= rect[1] + rect[3]) return annotation
          }
        }
        return null
      }

      /** 当前页面内的文字选区 → 归一化矩形；没有有效选区返回 null。 */
      const readSelection = () => {
        const selection = typeof window === 'undefined' ? null : window.getSelection()
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
        if (!textRef.current) return null
        const range = selection.getRangeAt(0)
        if (!textRef.current.contains(range.commonAncestorContainer)) return null
        const base = hostRef.current && hostRef.current.getBoundingClientRect()
        if (!base || base.width === 0 || base.height === 0) return null
        const rects = selectionRects(range, base)
        if (rects.length === 0) return null
        return { rects, text: String(selection.toString() || '').slice(0, 2000) }
      }

      // 选择文字：select 工具给一个浮动「高亮」按钮，highlight 工具直接落。
      /** 选中的文字落成标注；浮动条、右键菜单与 highlight 工具共用。 */
      const applyMark = (type, mark, markColor) => {
        if (!mark || !mark.rects || mark.rects.length === 0) return
        const nextColor = markColor || color
        if (markColor && props.onColor) props.onColor(markColor)
        props.onAdd({ type, page: pageNumber, color: nextColor, rects: mark.rects, text: mark.text })
        setFloatBar(null)
        setMenu(null)
        const selection = window.getSelection()
        if (selection) selection.removeAllRanges()
      }

      /**
       * 松开鼠标：有选区就弹工具条（任何选择类工具都行），没有选区则按点击位置
       * 命中已有标注。选区保留到点工具条为止 —— 与常见 PDF 编辑器一致，不会
       * 选完字瞬间消失。
       */
      const handleMouseUp = (event) => {
        if (tool === 'rect' || tool === 'text' || tool === 'pan') return
        const selection = window.getSelection()
        const collapsed = !selection || selection.isCollapsed || selection.rangeCount === 0
        if (collapsed) {
          if (tool !== 'select' || !event) return
          const point = pointOf(event)
          if (!point) return
          const hit = hitAt(point)
          props.onSelect(hit ? hit.id : null)
          return
        }
        const range = selection.getRangeAt(0)
        if (!textRef.current || !textRef.current.contains(range.commonAncestorContainer)) return
        const base = hostRef.current && hostRef.current.getBoundingClientRect()
        if (!base) return
        const rects = selectionRects(range, base)
        if (rects.length === 0) return
        const text = String(selection.toString() || '').slice(0, 2000)
        if (tool === 'highlight') {
          applyMark('highlight', { rects, text })
          return
        }
        const first = range.getBoundingClientRect()
        const localTop = first.top - base.top
        const barHeight = 36
        // 选区上方 8px；贴顶时翻到选区下方，不会被裁掉。
        const above = localTop - barHeight - 8
        const top = above >= 0 ? above : Math.min(base.height - barHeight, first.bottom - base.top + 8)
        // 以选区中心对齐（工具条宽约 300，含五个色点），并夹在页面内。
        const centered = first.left - base.left + first.width / 2 - 150
        const left = Math.max(0, Math.min(Math.max(0, base.width - 300), centered))
        setFloatBar({ left, top, text, rects })
      }

      /**
       * 右键菜单：选中文字后直接落高亮，或删除覆盖这段文字的已有标注。
       * 点在已有标注上也能删；空白处右键不拦截，交给宿主默认菜单。
       */
      const handleContextMenu = (event) => {
        const live = readSelection()
        const snapshot = rightRef.current && Date.now() - rightRef.current.at < 2000 ? rightRef.current : null
        rightRef.current = null
        const picked = live || snapshot
        const point = pointOf(event)
        const hit = hitAt(point)
        // 右键在选区外：以点中的标注为准，不要把之前的选区算进来。
        const inside = picked && point
          ? picked.rects.some((rect) =>
            point.x >= rect[0] && point.x <= rect[0] + rect[2] &&
            point.y >= rect[1] && point.y <= rect[1] + rect[3])
          : false
        const useSelection = picked && (!hit || inside) ? picked : null
        if (!useSelection && !hit) return
        event.preventDefault()
        event.stopPropagation()
        // 与选区相交的标注 + 点中的标注一起列出：右键一段已高亮的文字即可删掉那几条。
        const targets = useSelection
          ? annotations.filter((annotation) => (annotation.rects || []).some((rect) =>
            useSelection.rects.some((other) => rectsOverlap(rect, other))))
          : []
        if (hit && targets.indexOf(hit) === -1) targets.push(hit)
        if (hit) props.onSelect(hit.id)
        setFloatBar(null)
        setMenu({
          x: event.clientX,
          y: event.clientY,
          rects: useSelection ? useSelection.rects : null,
          text: useSelection ? useSelection.text : '',
          hit: hit || null,
          targets,
        })
      }

      /** 归一化矩形 → 直接写到元素样式；拖拽期间走这个，不触发 React 重渲染。 */
      const paintRect = (element, rect) => {
        if (!element) return
        element.style.left = (rect[0] * 100) + '%'
        element.style.top = (rect[1] * 100) + '%'
        element.style.width = (rect[2] * 100) + '%'
        element.style.height = (rect[3] * 100) + '%'
      }

      /** 拖拽/缩放开始时记录基准：起点、页面像素尺寸、原始矩形。 */
      const beginTransform = (event, annotation, mode, corner, element) => {
        if (tool !== 'select' || event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        props.onSelect(annotation.id)
        const base = hostRef.current && hostRef.current.getBoundingClientRect()
        if (!base || base.width === 0 || base.height === 0) return
        moveRef.current = {
          id: annotation.id,
          mode,
          corner: corner || '',
          startX: event.clientX,
          startY: event.clientY,
          width: base.width,
          height: base.height,
          origin: (annotation.rects && annotation.rects[0] ? annotation.rects[0] : [0, 0, 0.3, 0.1]).slice(),
          element: element || null,
          changed: false,
        }
      }

      /** 按下方框：选中并进入拖动；双击仍由 onClick 链上的编辑生效。 */
      const startMove = (event, annotation) => {
        const group = event.currentTarget && event.currentTarget.parentElement
        beginTransform(event, annotation, 'move', '', group)
      }

      /** 按下角落据点：以对角为锚点缩放。 */
      const startResize = (event, annotation, corner) => {
        const group = event.currentTarget && event.currentTarget.parentElement
        beginTransform(event, annotation, 'resize', corner, group)
      }

      /** 在页面上按下：方框工具开始拖拽；文字工具点一下建框；否则取消选择。 */
      const handlePointerDown = (event) => {
        if (event.button === 2) {
          // 右键的默认动作会清掉选区：在它之前快照，contextmenu 里再用。
          const picked = readSelection()
          rightRef.current = picked ? { ...picked, at: Date.now() } : null
          return
        }
        if (event.button !== 0) return
        setFloatBar(null)
        setMenu(null)
        if (tool === 'pan') {
          const scroller = hostRef.current && hostRef.current.closest('.dshEndnotePdf_scroll')
          if (!scroller) return
          event.preventDefault()
          panRef.current = {
            x: event.clientX,
            y: event.clientY,
            top: scroller.scrollTop,
            left: scroller.scrollLeft,
            scroller,
          }
          setPanning(true)
          return
        }
        if (tool === 'rect') {
          const point = pointOf(event)
          if (!point) return
          event.preventDefault()
          dragRef.current = { x: point.x, y: point.y }
          setDraftRect({ x: point.x, y: point.y, w: 0, h: 0 })
          return
        }
        if (tool === 'text') {
          const point = pointOf(event)
          if (!point) return
          const created = { type: 'text', page: pageNumber, color, rects: [[point.x, point.y, 0.36, 0.1]], note: '' }
          const id = props.onAdd(created)
          if (id) startEditing(id)
          return
        }
        props.onSelect(null)
      }

      /**
       * 拖拽中更新预览矩形。
       * 直接改 draft 元素的 style、不 setState：mousemove 频率高，走 React
       * 重渲染会让整个页面（含所有已有标注）重新 diff，拖框就发涩。
       */
      const handlePointerMove = (event) => {
        const pan = panRef.current
        if (pan) {
          pan.scroller.scrollTop = pan.top - (event.clientY - pan.y)
          pan.scroller.scrollLeft = pan.left - (event.clientX - pan.x)
          return
        }
        const moving = moveRef.current
        if (moving) {
          const point = pointOf(event)
          if (!point) return
          const origin = moving.origin
          const dx = (event.clientX - moving.startX) / moving.width
          const dy = (event.clientY - moving.startY) / moving.height
          let x1 = origin[0]
          let y1 = origin[1]
          let x2 = origin[0] + origin[2]
          let y2 = origin[1] + origin[3]
          if (moving.mode === 'move') {
            x1 = Math.min(Math.max(0, x1 + dx), Math.max(0, 1 - origin[2]))
            y1 = Math.min(Math.max(0, y1 + dy), Math.max(0, 1 - origin[3]))
            x2 = x1 + origin[2]
            y2 = y1 + origin[3]
          } else if (moving.corner === 'nw') {
            x1 = Math.min(point.x, x2 - 0.02)
            y1 = Math.min(point.y, y2 - 0.02)
          } else if (moving.corner === 'ne') {
            x2 = Math.max(point.x, x1 + 0.02)
            y1 = Math.min(point.y, y2 - 0.02)
          } else if (moving.corner === 'sw') {
            x1 = Math.min(point.x, x2 - 0.02)
            y2 = Math.max(point.y, y1 + 0.02)
          } else if (moving.corner === 'se') {
            x2 = Math.max(point.x, x1 + 0.02)
            y2 = Math.max(point.y, y1 + 0.02)
          } else if (moving.corner === 'n') {
            // 边中点：只改高或只改宽，便于单独调一条边的位置。
            y1 = Math.min(point.y, y2 - 0.02)
          } else if (moving.corner === 's') {
            y2 = Math.max(point.y, y1 + 0.02)
          } else if (moving.corner === 'w') {
            x1 = Math.min(point.x, x2 - 0.02)
          } else if (moving.corner === 'e') {
            x2 = Math.max(point.x, x1 + 0.02)
          }
          x1 = Math.min(Math.max(0, x1), 1)
          y1 = Math.min(Math.max(0, y1), 1)
          x2 = Math.min(Math.max(0, x2), 1)
          y2 = Math.min(Math.max(0, y2), 1)
          const rect = [x1, y1, x2 - x1, y2 - y1]
          if (!moving.changed && (Math.abs(event.clientX - moving.startX) + Math.abs(event.clientY - moving.startY)) > 3) {
            moving.changed = true
          }
          moving.current = rect
          paintRect(moving.element, rect)
          return
        }
        const origin = dragRef.current
        if (!origin) return
        const point = pointOf(event)
        if (!point) return
        const rect = {
          x: Math.min(origin.x, point.x),
          y: Math.min(origin.y, point.y),
          w: Math.abs(point.x - origin.x),
          h: Math.abs(point.y - origin.y),
        }
        const element = draftRef.current
        if (element) {
          element.style.left = (rect.x * 100) + '%'
          element.style.top = (rect.y * 100) + '%'
          element.style.width = (rect.w * 100) + '%'
          element.style.height = (rect.h * 100) + '%'
        } else {
          // 首个 mousemove 时预览框还没挂载，落一次 state 让它出现。
          setDraftRect(rect)
        }
      }

      /**
       * 松开：尺寸够大就落一个方框并进入框内编辑。
       * 矩形由「按下点 + 松开点」现算，不读 draftRect 状态：快速拖拽时
       * mousemove 的 state 可能还没提交，读旧值会把框丢掉。
       */
      const handlePointerUp = (event) => {
        if (panRef.current) {
          panRef.current = null
          setPanning(false)
          return
        }
        const moving = moveRef.current
        if (moving) {
          moveRef.current = null
          if (moving.changed && moving.current) {
            const rect = moving.current.map((value) => Math.round(value * 10000) / 10000)
            if (rect[2] > 0.01 && rect[3] > 0.01) props.onUpdate(moving.id, { rects: [rect] })
            props.onSelect(moving.id)
          }
          return
        }
        const origin = dragRef.current
        dragRef.current = null
        setDraftRect(null)
        if (!origin) return
        const point = pointOf(event)
        if (!point) return
        const rect = {
          x: Math.min(origin.x, point.x),
          y: Math.min(origin.y, point.y),
          w: Math.abs(point.x - origin.x),
          h: Math.abs(point.y - origin.y),
        }
        if (rect.w < 0.01 || rect.h < 0.01) return
        const created = { type: 'rect', page: pageNumber, color, rects: [[rect.x, rect.y, rect.w, rect.h]], note: '' }
        const id = props.onAdd(created)
        if (id) startEditing(id)
      }

      /** 进入编辑前清掉「Esc 丢弃」标记，否则下一次 blur 会被误吞。 */
      const startEditing = (id) => {
        discardRef.current = false
        setEditing(id)
      }

      const beginEdit = (annotation) => {
        startEditing(annotation.id)
        props.onSelect(annotation.id)
      }

      const commitNote = (annotation, note) => {
        if (note !== (annotation.note || '')) props.onUpdate(annotation.id, { note })
        setEditing(null)
      }

      /** 一条标注的可视化：高亮色块 / 下划线 / 删除线 / 可编辑方框。 */
      const renderMark = (annotation) => {
        if (annotation.type === 'highlight') {
          // 上下各外扩 1px：色带完整盖住字形，不会只涂到字腰（与阅读器高亮观感一致）。
          return annotation.rects.map((rect, index) => h('div', {
            key: annotation.id + '-' + index,
            className: 'dshEndnotePdf_hl',
            style: {
              left: (rect[0] * 100) + '%',
              top: 'calc(' + (rect[1] * 100) + '% - 1px)',
              width: (rect[2] * 100) + '%',
              height: 'calc(' + (rect[3] * 100) + '% + 2px)',
              background: annotation.color,
              opacity: annotation.id === selectedId ? 0.62 : 0.42,
            },
          }))
        }
        if (annotation.type === 'underline' || annotation.type === 'strike') {
          return annotation.rects.map((rect, index) => h('div', {
            key: annotation.id + '-' + index,
            className: 'dshEndnotePdf_line',
            style: {
              left: (rect[0] * 100) + '%',
              top: ((rect[1] + (annotation.type === 'underline' ? rect[3] : rect[3] / 2)) * 100) + '%',
              width: (rect[2] * 100) + '%',
              borderTop: '2px solid ' + annotation.color,
            },
          }))
        }
        const rect = annotation.rects[0] || [0, 0, 0.3, 0.1]
        const selected = annotation.id === selectedId
        const movable = tool === 'select'
        return h('div', {
          key: annotation.id,
          className: 'dshEndnotePdf_group',
          'data-mark': annotation.id,
          style: {
            left: (rect[0] * 100) + '%',
            top: (rect[1] * 100) + '%',
            width: (rect[2] * 100) + '%',
            height: (rect[3] * 100) + '%',
          },
        },
          h('div', {
            className: 'dshEndnotePdf_box' + (selected ? ' dshEndnotePdf_sel' : ''),
            'data-movable': movable ? 'true' : 'false',
            style: {
              borderColor: annotation.color,
              // 默认完全不填充；设置里可选淡/中两档同色底。
              background: boxFill > 0
                ? annotation.color + Math.round(boxFill * 255).toString(16).padStart(2, '0')
                : 'transparent',
            },
            onMouseDown: (event) => { startMove(event, annotation) },
            onDoubleClick: (event) => { event.stopPropagation(); beginEdit(annotation) },
          },
            editing === annotation.id
              ? h('div', { className: 'dshEndnotePdf_note', ref: noteRef, onMouseDown: (event) => event.stopPropagation() },
                h('textarea', {
                  autoFocus: true,
                  defaultValue: annotation.note || '',
                  style: { fontSize: noteFontSize + 'px', color: ui.noteColor },
                  placeholder: t('notePlaceholder'),
                  // 点方框外、点工具栏、切页/切换工具都会先 blur：这里直接提交，
                  // 不用再找「完成」按钮。
                  onBlur: (event) => {
                    const discard = discardRef.current
                    discardRef.current = false
                    if (discard) return
                    commitNote(annotation, event.currentTarget.value)
                  },
                  onKeyDown: (event) => {
                    if (event.key === 'Escape') {
                      discardRef.current = true
                      setEditing(null)
                    }
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                      commitNote(annotation, event.currentTarget.value)
                    }
                  },
                }),
                // 完成按钮行已删除：onBlur + 外部 mousedown 自动保存。
              )
              : h('div', {
                className: 'dshEndnotePdf_boxText',
                style: { fontSize: noteFontSize + 'px', color: ui ? ui.noteColor : '#333' },
              }, annotation.note || ''),
          ),
          // 有文字且未选中时在左上角打一个小「注」标，不挡正文也不和缩放据点撞位。
          !selected && editing !== annotation.id && annotation.note
            ? h('div', { className: 'dshEndnotePdf_badge', style: { background: annotation.color } }, '注')
            : null,
          // 选中后的四个角据点：拖动改尺寸，与普通 PDF 编辑器一致。
          selected && movable && editing !== annotation.id
            ? ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((corner) => h('div', {
              key: annotation.id + '-' + corner,
              className: 'dshEndnotePdf_handle',
              'data-corner': corner,
              style: {
                left: corner.indexOf('e') !== -1 ? '100%' : corner.indexOf('w') !== -1 ? '0%' : '50%',
                top: corner.indexOf('s') !== -1 ? '100%' : corner.indexOf('n') !== -1 ? '0%' : '50%',
              },
              onMouseDown: (event) => startResize(event, annotation, corner),
            }))
            : null,
        )
      }

      /** 当前正在编辑的框：读出输入框里的文字并提交。 */
      const commitEditing = () => {
        if (!editing) return
        const annotation = annotations.find((item) => item.id === editing)
        const textarea = noteRef.current && noteRef.current.querySelector('textarea')
        const discard = discardRef.current
        discardRef.current = false
        if (discard || !annotation) {
          setEditing(null)
          return
        }
        commitNote(annotation, textarea ? textarea.value : (annotation.note || ''))
      }

      // 点方框外即保存：不依赖 textarea 的 blur（宿主里合成 blur 不总触发）。
      React.useEffect(() => {
        if (!editing) return undefined
        const onDown = (event) => {
          const note = noteRef.current
          if (note && note.contains(event.target)) return
          commitEditing()
        }
        const onCommitAll = () => commitEditing()
        window.addEventListener('mousedown', onDown, true)
        window.addEventListener('dsh-endnote:commit-note', onCommitAll)
        return () => {
          window.removeEventListener('mousedown', onDown, true)
          window.removeEventListener('dsh-endnote:commit-note', onCommitAll)
        }
      }, [editing, annotations])

      // 菜单打开后：点别处、滚动、缩放窗口、按 Esc 都关闭。
      // 菜单自身 stopPropagation 了 mousedown，所以内部点击不会被这里关掉。
      React.useEffect(() => {
        if (!menu) return undefined
        const close = () => setMenu(null)
        const onKey = (event) => { if (event.key === 'Escape') setMenu(null) }
        window.addEventListener('mousedown', close)
        window.addEventListener('scroll', close, true)
        window.addEventListener('resize', close)
        window.addEventListener('keydown', onKey)
        return () => {
          window.removeEventListener('mousedown', close)
          window.removeEventListener('scroll', close, true)
          window.removeEventListener('resize', close)
          window.removeEventListener('keydown', onKey)
        }
      }, [menu])

      const width_ = dims ? dims.width : width
      // 高度优先用父级算好的页面尺寸：未渲染的页也要占准位置，滚动条才不会跳。
      const height_ = pageHeight || (dims ? dims.height : Math.round(width * 1.414))

      // 拖拽在 window 上跟踪：拖出页面边界也不会丢失 pointerup/mouseup。
      // 用鼠标事件而不是 PointerEvent —— 宿主旧 Chromium 的 React 合成事件
      // 对 pointerdown 的派发不稳定，mouse 事件在所有桌面宿主上一致。
      React.useEffect(() => {
        window.addEventListener('mousemove', handlePointerMove)
        window.addEventListener('mouseup', handlePointerUp)
        return () => {
          window.removeEventListener('mousemove', handlePointerMove)
          window.removeEventListener('mouseup', handlePointerUp)
        }
      }, [tool, color, pageNumber])

      return h('div', {
        className: 'dshEndnotePdf_page',
        'data-tool': tool,
        'data-panning': panning ? 'true' : 'false',
        ref: hostRef,
        style: { width: width_ + 'px', height: height_ + 'px' },
        onMouseDown: handlePointerDown,
        onMouseUp: handleMouseUp,
        onContextMenu: handleContextMenu,
      },
        h('canvas', { className: 'dshEndnotePdf_canvas', ref: canvasRef }),
        h('div', { className: 'dshEndnotePdf_text', ref: textRef }),
        h('div', { className: 'dshEndnotePdf_findLayer' },
          findMarks.map((mark, markIndex) => mark.rects.map((rect, rectIndex) => h('div', {
            key: 'find-' + markIndex + '-' + rectIndex,
            className: 'dshEndnotePdf_find',
            'data-active': mark.active ? 'true' : 'false',
            style: {
              left: (rect[0] * 100) + '%',
              top: (rect[1] * 100) + '%',
              width: (rect[2] * 100) + '%',
              height: (rect[3] * 100) + '%',
            },
          }))),
        ),
        h('div', { className: 'dshEndnotePdf_marks', style: hideMarks ? { display: 'none' } : null },
          annotations.map(renderMark),
        ),
        draftRect ? h('div', {
          className: 'dshEndnotePdf_draft',
          ref: draftRef,
          style: {
            left: (draftRect.x * 100) + '%',
            top: (draftRect.y * 100) + '%',
            width: (draftRect.w * 100) + '%',
            height: (draftRect.h * 100) + '%',
          },
        }) : null,
        floatBar ? h('div', {
          className: 'dshEndnotePdf_float',
          style: { left: Math.max(0, Math.min(Math.max(0, width_ - 300), floatBar.left)) + 'px', top: floatBar.top + 'px' },
          onMouseDown: (event) => event.stopPropagation(),
          onMouseUp: (event) => event.stopPropagation(),
        },
          // 浮动浮条色板：绿、红 + 取色器。
          PDF_PRESET_COLORS.map((entry) => h('button', {
            key: 'float-' + entry,
            type: 'button',
            className: 'dshEndnotePdf_floatDot',
            title: t('highlight'),
            'data-active': color === entry,
            style: { background: entry },
            onClick: () => applyMark('highlight', floatBar, entry),
          })),
          h('label', {
            className: 'dshEndnotePdf_floatDot dshEndnotePdf_pickerLabel',
            title: t('customColor'),
            style: {
              background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
            },
          },
            h('input', {
              type: 'color',
              className: 'dshEndnotePdf_pickerInput',
              value: color,
              onChange: (event) => {
                const next = event.currentTarget.value
                pickColor(next)
                pickExtraColor(next)
                applyMark('highlight', floatBar, next)
                setFloatBar(null)
              },
            }),
          ),
          h('span', { className: 'dshEndnotePdf_floatSep' }),
          h('button', { type: 'button', onClick: () => applyMark('highlight', floatBar) }, t('highlight')),
          h('button', { type: 'button', onClick: () => applyMark('underline', floatBar) }, t('underline')),
          h('button', { type: 'button', onClick: () => applyMark('strike', floatBar) }, t('strike')),
          h('button', {
            type: 'button',
            onClick: () => {
              if (floatBar.text) {
                try { void navigator.clipboard.writeText(String(floatBar.text)) } catch { /* 无剪贴板权限 */ }
              }
              setFloatBar(null)
            },
          }, t('copy')),
        ) : null,
        // 右键菜单用 position:fixed：不会被滚动容器裁掉，也不撑开页面布局。
        menu ? h('div', {
          className: 'dshEndnotePdf_menu',
          style: {
            left: Math.max(8, Math.min(menu.x, (globalThis.innerWidth || 1200) - 252)) + 'px',
            top: Math.max(8, Math.min(menu.y, (globalThis.innerHeight || 800) - 300)) + 'px',
          },
          onMouseDown: (event) => event.stopPropagation(),
          onMouseUp: (event) => event.stopPropagation(),
          onContextMenu: (event) => { event.preventDefault(); event.stopPropagation() },
        },
          menu.text ? h('div', { className: 'dshEndnotePdf_menuTitle' }, menu.text.slice(0, 60)) : null,
          menu.rects ? h('div', { className: 'dshEndnotePdf_menuRow', 'data-static': true },
            h('span', { style: { marginRight: 'auto' } }, t('highlight')),
            PDF_PRESET_COLORS.map((entry) => h('button', {
              key: 'menu-dot-' + entry,
              type: 'button',
              className: 'dshEndnotePdf_floatDot',
              title: entry,
              'data-active': color === entry,
              style: { background: entry, borderColor: 'rgba(0,0,0,.18)' },
              onClick: () => applyMark('highlight', menu, entry),
            })),
            h('label', {
              className: 'dshEndnotePdf_floatDot dshEndnotePdf_pickerLabel',
              title: t('customColor'),
              style: {
                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                borderColor: 'rgba(0,0,0,.18)',
              },
            },
              h('input', {
                type: 'color',
                className: 'dshEndnotePdf_pickerInput',
                value: color,
                onChange: (event) => {
                  const next = event.currentTarget.value
                  pickColor(next)
                  pickExtraColor(next)
                  applyMark('highlight', menu, next)
                  setMenu(null)
                },
              }),
            ),
          ) : null,
          menu.rects ? h('button', { type: 'button', className: 'dshEndnotePdf_menuRow', onClick: () => applyMark('underline', menu) }, t('underline')) : null,
          menu.rects ? h('button', { type: 'button', className: 'dshEndnotePdf_menuRow', onClick: () => applyMark('strike', menu) }, t('strike')) : null,
          menu.rects ? h('button', { type: 'button', className: 'dshEndnotePdf_menuRow', onClick: () => { copyText(menu.text); setMenu(null) } }, t('copy')) : null,
          menu.targets.length > 0 ? h('div', { key: 'menu-sep', className: 'dshEndnotePdf_menuSep' }) : null,
          menu.targets.length > 0 ? h('div', { key: 'menu-del-title', className: 'dshEndnotePdf_menuTitle', style: { paddingBottom: '2px' } }, t('removeAnnotation')) : null,
          menu.targets.map((annotation) => h('button', {
            key: 'menu-del-' + annotation.id,
            type: 'button',
            className: 'dshEndnotePdf_menuRow',
            'data-danger': true,
            onClick: () => { props.onRemove(annotation.id); setMenu(null) },
          }, annotationLabel(annotation, t).slice(0, 24) + '  ×')),
          menu.hit && (menu.hit.type === 'rect' || menu.hit.type === 'text')
            ? h('button', { type: 'button', className: 'dshEndnotePdf_menuRow', onClick: () => { beginEdit(menu.hit); setMenu(null) } }, t('editNote'))
            : null,
        ) : null,
      )
    }

    /**
     * 文档主体：工具栏 + 连续滚动页面。
     * 宿主传 bytes（bytes-complete）、resourceAddress 与 scrollportRef。
     */
    function EndnotePdfBody(props) {
      const h = React.createElement
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const address = props.resourceAddress || ''
      // 文件树给的是工作区相对地址；useResource 才是绝对路径（标注键需要）。
      const useResource = props.useResource
      const resource = typeof useResource === 'function' ? useResource(address) : null
      const absolutePath = resource && resource.value && typeof resource.value.absolutePath === 'string'
        ? resource.value.absolutePath
        : ''
      const bytes = props.content && props.content.kind === 'bytes' ? props.content.data : null
      const [doc, setDoc] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [annotations, setAnnotations] = React.useState([])
      const [selectedId, setSelectedId] = React.useState(null)
      const [tool, setTool] = React.useState('select')
      const [color, setColor] = React.useState(() => readUiPrefs().highlightColor)
      const [fitWidth, setFitWidth] = React.useState(true)
      const [zoom, setZoom] = React.useState(1)
      const [paneWidth, setPaneWidth] = React.useState(0)
      const [status, setStatus] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [pageWidth, setPageWidth] = React.useState(0)
      const [currentPage, setCurrentPage] = React.useState(1)
      const [exporting, setExporting] = React.useState(false)
      const [exportInfo, setExportInfo] = React.useState(null)
      // 提示行 / 标注列表 / 页面标注都可单独隐藏（记在 localStorage）。
      const [ui, setUi] = React.useState(readUiPrefs)
      // 页面尺寸比（高/宽）：长文档里未渲染的页也要占准确位置，滚动条不跳。
      const [pageSizes, setPageSizes] = React.useState({})
      // 先只激活第 1 页，观察器到位后再按视口维护；null 表示全部渲染（降级）。
      const [activePages, setActivePages] = React.useState(() => new Set([1]))
      const [baseWidth, setBaseWidth] = React.useState(0)
      // 按住空格临时变抓手（松开/失焦恢复箭头），与普通 PDF 阅读器一致。
      const [panMode, setPanMode] = React.useState(false)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [dirtyFlag, setDirtyFlag] = React.useState(false)
      const settingsRef = React.useRef(null)
      const annotationsRef = React.useRef([])
      const [findOpen, setFindOpen] = React.useState(false)
      const [findQuery, setFindQuery] = React.useState('')
      const [findState, setFindState] = React.useState({ matches: [], current: 0, busy: false })
      const [undoDepth, setUndoDepth] = React.useState(0)
      const findIndexRef = React.useRef(null)
      const docRef = React.useRef(null)
      const findInputRef = React.useRef(null)
      const pageObserverRef = React.useRef(null)
      // 标注侧车只接受绝对路径：useResource 还没回来时先留空，不要用相对路径去请求
      // （否则每次打开 PDF 都会先发一个 400，随后再用绝对路径重读一次）。
      const pdfPath = React.useMemo(() => {
        if (absolutePath) return absolutePath
        const derived = pdfPathFromAddress(address)
        return isAbsolutePdfPath(derived) ? derived : ''
      }, [absolutePath, address])
      const scrollRef = React.useRef(null)
      const observerRef = React.useRef(null)
      const historyRef = React.useRef([])
      const dirtyRef = React.useRef(false)
      // 用户主动选过颜色后，方框/文字框也跟着当前色板，不再强制红框。
      const colorTouchedRef = React.useRef(false)
      const loadedRef = React.useRef(false)
      const pageRefs = React.useRef(new Map())

      React.useEffect(() => {
        ensurePdfCss()
      }, [])

      // 打开 PDF：bytes 是宿主给的完整文件，复制一份交给 PDF.js（它会 detach）。
      React.useEffect(() => {
        if (!bytes || bytes.length === 0) return undefined
        let live = true
        let task = null
        let opened = null
        ;(async () => {
          try {
            const pdfjs = await loadPdfjs()
            const origin = typeof location === 'undefined' ? '' : location.origin
            const base = new URL(PDF_VENDOR, origin + '/').href
            task = pdfjs.getDocument({
              data: new Uint8Array(bytes.slice()),
              cMapUrl: base + 'cmaps/',
              cMapPacked: true,
              standardFontDataUrl: base + 'standard_fonts/',
              wasmUrl: base + 'wasm/',
              isEvalSupported: false,
            })
            opened = await task.promise
            if (!live) { void task.destroy(); return }
            setDoc(opened)
            setError(null)
          } catch (cause) {
            if (live) setError(cause instanceof Error ? cause.message : String(cause))
          }
        })()
        return () => {
          live = false
          try { if (task) void task.destroy() } catch { /* 已销毁 */ }
        }
      }, [bytes])

      // 读取侧车标注。
      React.useEffect(() => {
        loadedRef.current = false
        if (!pdfPath) return undefined
        let live = true
        const controller = new AbortController()
        ;(async () => {
          try {
            const data = await fetchAnnotations(pdfPath)
            if (!live) return
            setAnnotations(Array.isArray(data.annotations) ? data.annotations : [])
            loadedRef.current = true
            if (data.updatedAt) setStatus({ tone: 'ok', text: t('saved') + ' ' + data.updatedAt.slice(11, 16) })
          } catch (cause) {
            if (live) setStatus({ tone: 'error', text: t('loadFailed') + (cause instanceof Error ? cause.message : String(cause)) })
          }
        })()
        return () => { live = false; controller.abort() }
      }, [pdfPath, t])

      // 面板宽度 → 页面渲染宽度（适应宽度时）。
      const attachScroll = React.useCallback((element) => {
        observerRef.current?.disconnect()
        observerRef.current = null
        scrollRef.current = element
        if (props.scrollportRef) {
          try { props.scrollportRef(element) } catch { /* 宿主已卸载 */ }
        }
        if (!element) return
        setPaneWidth(element.clientWidth)
        const observer = new ResizeObserver(() => setPaneWidth(element.clientWidth))
        observer.observe(element)
        observerRef.current = observer
        return () => { observer.disconnect() }
      }, [props.scrollportRef])

      const pageCount = doc ? doc.numPages : 0
      const usable = Math.max(200, paneWidth - 32)

      // 缩放变化时重算每页宽度（fitWidth 用面板宽度，否则用 100% 缩放基准）。
      React.useEffect(() => {
        if (!doc) return
        let live = true
        ;(async () => {
          try {
            const first = await doc.getPage(1)
            if (!live) return
            const base = first.getViewport({ scale: 1 })
            const next = fitWidth ? usable : Math.min(2400, base.width * zoom)
            setBaseWidth(base.width)
            setPageWidth(Math.max(120, next))
          } catch { /* 保持上一尺寸 */ }
        })()
        return () => { live = false }
      }, [doc, fitWidth, zoom, usable])

      // 逐页读取宽高比（只取数字，很快）；失败就按 A4 比例占位。
      React.useEffect(() => {
        if (!doc) { setPageSizes({}); return undefined }
        let live = true
        ;(async () => {
          const sizes = {}
          for (let page = 1; page <= doc.numPages; page += 1) {
            try {
              const proxy = await doc.getPage(page)
              const viewport = proxy.getViewport({ scale: 1 })
              sizes[page] = viewport.height / viewport.width
              if (typeof proxy.cleanup === 'function') proxy.cleanup()
            } catch { /* 单页取不到就按默认比例 */ }
            if (!live) return
          }
          setPageSizes(sizes)
        })()
        return () => { live = false }
      }, [doc])

      // 只渲染视口附近的页：长文献不必一次性铺满几百张 canvas。
      React.useEffect(() => {
        if (!doc || typeof IntersectionObserver !== 'function') {
          setActivePages(null)
          return undefined
        }
        const root = scrollRef.current
        if (!root) return undefined
        const visible = new Set([1])
        setActivePages(new Set(visible))
        const observer = new IntersectionObserver((entries) => {
          let changed = false
          for (const entry of entries) {
            const page = Number(entry.target.getAttribute('data-page') || 0)
            if (!page) continue
            if (entry.isIntersecting) {
              if (!visible.has(page)) { visible.add(page); changed = true }
            } else if (visible.has(page)) {
              visible.delete(page)
              changed = true
            }
          }
          if (changed) setActivePages(new Set(visible))
        }, { root, rootMargin: '800px 0px' })
        pageObserverRef.current = observer
        for (const element of pageRefs.current.values()) observer.observe(element)
        return () => {
          observer.disconnect()
          pageObserverRef.current = null
        }
      }, [doc])

      // Ctrl/Cmd + 滚轮缩放（普通 PDF 阅读器的习惯操作）。
      React.useEffect(() => {
        const element = scrollRef.current
        if (!element) return undefined
        const onWheel = (event) => {
          if (!event.ctrlKey && !event.metaKey) return
          event.preventDefault()
          const fromFit = usable / (baseWidth || usable)
          const current = fitWidth ? fromFit : zoom
          const next = Math.max(0.4, Math.min(3, Math.round((current - Math.sign(event.deltaY) * 0.1) * 100) / 100))
          setFitWidth(false)
          setZoom(next)
        }
        element.addEventListener('wheel', onWheel, { passive: false })
        return () => element.removeEventListener('wheel', onWheel)
      }, [doc, fitWidth, zoom, usable, baseWidth])

      // 空格 = 抓手。输入框/文本域里不接管，避免打不出空格。
      React.useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const isSpace = (event) => event.code === 'Space' || event.key === ' '
        const typingIn = (target) => Boolean(target) &&
          (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)
        const onKeyDown = (event) => {
          if (!isSpace(event) || typingIn(event.target)) return
          event.preventDefault()
          setPanMode(true)
        }
        const onKeyUp = (event) => {
          if (!isSpace(event)) return
          setPanMode(false)
        }
        const onBlur = () => setPanMode(false)
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        window.addEventListener('blur', onBlur)
        return () => {
          window.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('keyup', onKeyUp)
          window.removeEventListener('blur', onBlur)
        }
      }, [])

      const markDirty = () => {
        dirtyRef.current = true
        setDirtyFlag(true)
        setUndoDepth(historyRef.current.length)
      }

      // 保存按钮与 Ctrl+S 读的是最新标注，不能依赖上一次渲染的闭包。
      React.useEffect(() => { annotationsRef.current = annotations }, [annotations])

      const saveNow = React.useCallback(async () => {
        if (!pdfPath) {
          setStatus({ tone: 'error', text: t('noPath') })
          return
        }
        setSaving(true)
        try {
          const data = await saveAnnotations(pdfPath, annotationsRef.current)
          dirtyRef.current = false
          setDirtyFlag(false)
          setStatus({ tone: 'ok', text: t('saved') + ' ' + (data.updatedAt || '').slice(11, 19) })
        } catch (cause) {
          setStatus({ tone: 'error', text: t('saveFailed') + (cause instanceof Error ? cause.message : String(cause)) })
        } finally {
          setSaving(false)
        }
      }, [pdfPath, t])

      const pickColor = React.useCallback((next) => {
        colorTouchedRef.current = true
        setColor(next)
      }, [])

      /** 标注字号档位（小/标准/大/特大），与面板偏好一起记在 localStorage。 */
      const pickFontScale = React.useCallback((scale) => {
        setUi((current) => {
          const next = { ...current, fontScale: scale }
          writeUiPrefs(next)
          return next
        })
      }, [])

      /** 默认高亮色：改完新落的色都用它，也同步当前色板。 */
      const pickHighlightColor = React.useCallback((next) => {
        setColor(next)
        colorTouchedRef.current = false
        setUi((current) => {
          const updated = { ...current, highlightColor: next }
          writeUiPrefs(updated)
          return updated
        })
      }, [])

      /** 默认方框色：只影响之后新建的方框，不改已有标注。 */
      const pickBoxColor = React.useCallback((next) => {
        setUi((current) => {
          const updated = { ...current, boxColor: next }
          writeUiPrefs(updated)
          return updated
        })
      }, [])

      const pickNoteColor = React.useCallback((next) => {
        setUi((current) => {
          const updated = { ...current, noteColor: next }
          writeUiPrefs(updated)
          return updated
        })
      }, [])

      const pickExtraColor = React.useCallback((next) => {
        setUi((current) => {
          if (current.extraColors.indexOf(next) === -1) {
            const updated = { ...current, extraColors: [...current.extraColors, next] }
            writeUiPrefs(updated)
            return updated
          }
          return current
        })
      }, [])

      /** 方框内部填充档位（无 / 淡 / 中），同样记入面板偏好。 */
      const pickBoxFill = React.useCallback((fill) => {
        setUi((current) => {
          const next = { ...current, boxFill: fill }
          writeUiPrefs(next)
          return next
        })
      }, [])

      const toggleUi = React.useCallback((key) => {
        setUi((current) => {
          const next = { ...current, [key]: !current[key] }
          writeUiPrefs(next)
          return next
        })
      }, [])

      // 设置弹层：点外部（不含弹层内部）或按 Esc 关闭。
      React.useEffect(() => {
        if (!settingsOpen) return undefined
        const onDown = (event) => {
          const wrap = settingsRef.current
          if (wrap && wrap.contains(event.target)) return
          setSettingsOpen(false)
        }
        const onKey = (event) => { if (event.key === 'Escape') setSettingsOpen(false) }
        window.addEventListener('mousedown', onDown)
        window.addEventListener('keydown', onKey)
        return () => {
          window.removeEventListener('mousedown', onDown)
          window.removeEventListener('keydown', onKey)
        }
      }, [settingsOpen])

      /** 追加标注，返回新 id（调用方据此立即进入编辑）。 */
      const addAnnotation = React.useCallback((input) => {
        const id = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : 'a-' + Date.now() + '-' + Math.random().toString(16).slice(2)
        const requested = input.color || color
        // 方框/文字框默认用设置里的方框色；手动选过颜色就按所选来。
        const boxDefault = (input.type === 'rect' || input.type === 'text') &&
          !colorTouchedRef.current ? ui.boxColor : requested
        const annotation = {
          id,
          type: input.type,
          page: input.page,
          color: boxDefault,
          rects: input.rects,
          text: input.text || '',
          note: input.note || '',
          createdAt: new Date().toISOString(),
        }
        setAnnotations((current) => {
          historyRef.current.push(current)
          if (historyRef.current.length > 80) historyRef.current.shift()
          return [...current, annotation]
        })
        markDirty()
        setSelectedId(id)
        return id
      }, [color, ui.boxColor])

      const updateAnnotation = React.useCallback((id, patch) => {
        setAnnotations((current) => {
          historyRef.current.push(current)
          if (historyRef.current.length > 80) historyRef.current.shift()
          return current.map((annotation) => annotation.id === id ? { ...annotation, ...patch } : annotation)
        })
        markDirty()
      }, [])

      /** 删除指定标注（列表与 Delete 键共用）。 */
      const removeAnnotation = React.useCallback((id) => {
        if (!id) return
        setAnnotations((current) => {
          historyRef.current.push(current)
          if (historyRef.current.length > 80) historyRef.current.shift()
          return current.filter((annotation) => annotation.id !== id)
        })
        setSelectedId((current) => (current === id ? null : current))
        markDirty()
        setStatus({ tone: 'ok', text: t('cleared') })
      }, [t])

      // 保存前先让正在编辑的框提交文字，再等一拍落盘（annotationsRef 才会是新值）。
      const saveSoon = React.useCallback(() => {
        window.dispatchEvent(new CustomEvent('dsh-endnote:commit-note'))
        setTimeout(() => { void saveNow() }, 80)
      }, [saveNow])

      const removeSelected = React.useCallback(() => {
        if (!selectedId) return
        removeAnnotation(selectedId)
      }, [selectedId, removeAnnotation])

      /** 查找：首次先把整份文本层索引出来，之后每次输入只在索引里扫字符串。 */
      const runFind = React.useCallback(async (query) => {
        const needle = normalizeFindText(query)
        if (!doc || !needle) {
          setFindState({ matches: [], current: 0, busy: false })
          return
        }
        try {
          if (!findIndexRef.current) {
            setFindState((current) => ({ ...current, busy: true }))
            const index = await buildFindIndex(doc)
            // 索引期间换了文档：丢弃这批结果，不然命中会指向上一份 PDF。
            if (docRef.current !== doc) return
            findIndexRef.current = index
          }
          const matches = collectFindMatches(findIndexRef.current, needle)
          setFindState({ matches, current: 0, busy: false })
        } catch {
          setFindState({ matches: [], current: 0, busy: false })
        }
      }, [doc])

      const stepFind = React.useCallback((step) => {
        setFindState((current) => {
          if (current.matches.length === 0) return current
          const total = current.matches.length
          return { ...current, current: (current.current + step + total) % total }
        })
      }, [])

      // 输入防抖：中文输入法回车输入 composition 期间不反复扫全文。
      React.useEffect(() => {
        if (!findOpen) return undefined
        const timer = setTimeout(() => { void runFind(findQuery) }, 180)
        return () => clearTimeout(timer)
      }, [findOpen, findQuery, runFind])

      // 打开新文档时丢掉旧索引，避免命中指向上一份 PDF。
      React.useEffect(() => {
        docRef.current = doc
        findIndexRef.current = null
        setFindState({ matches: [], current: 0, busy: false })
      }, [doc])

      // 当前命中滚到视口上方三分之一处。
      React.useEffect(() => {
        const match = findState.matches[findState.current]
        const host = scrollRef.current
        const element = match ? pageRefs.current.get(match.page) : null
        if (!match || !host || !element) return
        const hostRect = host.getBoundingClientRect()
        const pageRect = element.getBoundingClientRect()
        const delta = pageRect.top - hostRect.top + (match.rects[0] ? match.rects[0][1] * pageRect.height : 0) - host.clientHeight / 3
        // 直接写 scrollTop：宿主环境里 scrollTo({behavior:'smooth'}) 会被吞掉。
        host.scrollTop = Math.max(0, host.scrollTop + delta)
      }, [findState.current, findState.matches])

      /** 导出带原生注释的副本；只写插件 dataDir/exports，不碰原件。 */
      const exportPdf = React.useCallback(async () => {
        if (!pdfPath) {
          setStatus({ tone: 'error', text: t('noPath') })
          return
        }
        if (annotations.length === 0) {
          setStatus({ tone: 'error', text: t('empty') })
          return
        }
        setExporting(true)
        setStatus({ tone: 'ok', text: t('exporting') })
        try {
          const response = await fetch(PDF_EXPORT, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: pdfPath, annotations }),
          })
          const data = await response.json().catch(() => null)
          if (!response.ok || !data || data.ok !== true) {
            throw new Error((data && data.error) || ('HTTP ' + response.status))
          }
          setExportInfo({ path: data.outputPath, skipped: data.skipped || 0 })
          setStatus({
            tone: data.skipped > 0 ? 'ok' : 'ok',
            text: t('exported') + data.outputPath + (data.skipped > 0 ? '（跳过 ' + data.skipped + ' 条）' : ''),
          })
        } catch (cause) {
          setStatus({ tone: 'error', text: t('exportFailed') + (cause instanceof Error ? cause.message : String(cause)) })
        } finally {
          setExporting(false)
        }
      }, [annotations, pdfPath, t])

      /** 在系统文件管理器中打开导出目录。 */
      const openExportFolder = React.useCallback(async () => {
        if (!exportInfo) return
        const dir = exportInfo.path.replace(/[\/][^\/]+$/, '')
        try {
          await fetch('/dsh-endnote/open-folder', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: dir }),
          })
        } catch { /* 打开失败不影响导出 */ }
      }, [exportInfo])

      const undo = React.useCallback(() => {
        const previous = historyRef.current.pop()
        if (!previous) return
        setAnnotations(previous)
        setSelectedId(null)
        markDirty()
      }, [])

      // 自动保存：停手 1.2 秒落盘；初次读取不触发。
      React.useEffect(() => {
        if (!dirtyRef.current || !pdfPath) return undefined
        const timer = setTimeout(() => {
          dirtyRef.current = false
          setDirtyFlag(false)
          setSaving(true)
          setStatus({ tone: 'ok', text: t('saving') })
          saveAnnotations(pdfPath, annotations).then((data) => {
            setStatus({ tone: 'ok', text: t('saved') + ' ' + (data.updatedAt || '').slice(11, 19) })
          }).catch((cause) => {
            setStatus({ tone: 'error', text: t('saveFailed') + (cause instanceof Error ? cause.message : String(cause)) })
          }).finally(() => setSaving(false))
        }, 1200)
        return () => clearTimeout(timer)
      }, [annotations, pdfPath, t])

      // 键盘：Delete 删除选中，Ctrl/Cmd+Z 撤销，Esc 退出编辑态。
      React.useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const onKey = (event) => {
          const target = event.target
          // Ctrl/Cmd+S：立即落盘；正在写框内文字时先 blur，让 blur 把文字提交到标注。
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault()
            saveSoon()
            return
          }
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault()
            setFindOpen(true)
            setTimeout(() => { if (findInputRef.current) findInputRef.current.focus() }, 0)
            return
          }
          const typing = target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)
          if (typing) return
          if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
            event.preventDefault()
            removeSelected()
          } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault()
            undo()
          } else if (event.key === 'Escape') {
            if (findOpen) setFindOpen(false)
            else setSelectedId(null)
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [selectedId, removeSelected, undo, findOpen, saveSoon])

      /** 滚动时更新当前页。 */
      const onScroll = () => {
        const host = scrollRef.current
        if (!host) return
        const middle = host.getBoundingClientRect().top + host.clientHeight / 2
        let best = currentPage
        for (const [page, element] of pageRefs.current) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= middle && rect.bottom >= middle) { best = page; break }
        }
        if (best !== currentPage) setCurrentPage(best)
      }

      const goToPage = (page) => {
        const element = pageRefs.current.get(page)
        if (element && element.scrollIntoView) element.scrollIntoView({ block: 'start' })
      }

      const byPage = React.useMemo(() => {
        const map = new Map()
        for (const annotation of annotations) {
          const page = annotation.page || 1
          if (!map.has(page)) map.set(page, [])
          map.get(page).push(annotation)
        }
        return map
      }, [annotations])

      // 查找命中按页分组；只有当前命中画成实心橙。
      const findByPage = React.useMemo(() => {
        const map = new Map()
        findState.matches.forEach((match, index) => {
          if (!map.has(match.page)) map.set(match.page, [])
          map.get(match.page).push({ rects: match.rects, active: index === findState.current })
        })
        return map
      }, [findState])

      /** 图标按钮：title/aria-label 保留原文字，便于悬停识别。 */
      const iconButton = (key, icon, label, extra) => h('button', {
        key,
        type: 'button',
        className: 'dshEndnotePdf_btn',
        'data-icon': 'true',
        title: label,
        'aria-label': label,
        ...(extra || {}),
      }, pdfIcon(icon))

      /** 设置里的缩放：从「适应宽度」接管时以当前适应比例为准，不跳回 100%。 */
      const stepZoom = (direction) => {
        const current = fitWidth ? (baseWidth > 0 ? usable / baseWidth : 1) : zoom
        setFitWidth(false)
        setZoom(Math.max(0.4, Math.min(3, Math.round((current + direction * 0.15) * 100) / 100)))
      }

      const total = annotations.length
      const statusTone = status ? status.tone : 'ok'

      return h('div', { className: 'dshEndnotePdf_root', 'data-rev': 'pdf-4', 'data-pan': panMode ? 'true' : 'false' },
        h('div', { className: 'dshEndnotePdf_bar' },
          iconButton('prev', 'prev', t('prevPage'), { disabled: currentPage <= 1, onClick: () => goToPage(Math.max(1, currentPage - 1)) }),
          h('span', { className: 'dshEndnotePdf_meta' }, samplePage(currentPage, pageCount)),
          iconButton('next', 'next', t('nextPage'), { disabled: pageCount === 0 || currentPage >= pageCount, onClick: () => goToPage(Math.min(pageCount, currentPage + 1)) }),
          h('span', { className: 'dshEndnotePdf_sep' }),
          iconButton('select', 'select', t('select'), { 'data-active': tool === 'select', onClick: () => setTool('select') }),
          iconButton('highlight', 'highlight', t('highlight'), { 'data-active': tool === 'highlight', onClick: () => setTool('highlight') }),
          iconButton('rect', 'rect', t('rect'), { 'data-active': tool === 'rect', onClick: () => setTool('rect') }),
          iconButton('text', 'text', t('text'), { 'data-active': tool === 'text', onClick: () => setTool('text') }),
          h('span', { className: 'dshEndnotePdf_sep' }),
          // 工具栏色板：绿、红 + 取色器。
          PDF_PRESET_COLORS.map((entry) => h('button', {
            key: entry,
            type: 'button',
            className: 'dshEndnotePdf_dot',
            title: entry,
            'data-active': color === entry,
            style: { background: entry },
            onClick: () => {
              pickColor(entry)
              if (selectedId) updateAnnotation(selectedId, { color: entry })
            },
          })),
          h('label', {
            className: 'dshEndnotePdf_dot dshEndnotePdf_pickerLabel',
            title: t('customColor'),
            style: {
              background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
            },
          },
            h('input', {
              type: 'color',
              className: 'dshEndnotePdf_pickerInput',
              value: color,
              onChange: (event) => {
                const next = event.currentTarget.value
                pickColor(next)
                pickExtraColor(next)
                if (selectedId) updateAnnotation(selectedId, { color: next })
              },
            }),
          ),
          h('span', { className: 'dshEndnotePdf_sep' }),
          iconButton('undo', 'undo', t('undo') + ' (Ctrl+Z)', { disabled: undoDepth === 0, onClick: undo }),
          iconButton('remove', 'trash', t('remove'), { disabled: !selectedId, onClick: removeSelected }),
          h('span', { className: 'dshEndnotePdf_sep' }),
          h('span', { className: 'dshEndnotePdf_settingsWrap', ref: settingsRef },
            iconButton('settings', 'gear', t('settings'), {
              'data-active': settingsOpen,
              onClick: () => setSettingsOpen((open) => !open),
            }),
            settingsOpen ? h('div', { className: 'dshEndnotePdf_settings' },
              h('div', { className: 'dshEndnotePdf_settingRow' },
                h('span', { className: 'dshEndnotePdf_settingLabel' }, t('zoomLabel')),
                h('button', { type: 'button', className: 'dshEndnotePdf_btn', 'data-active': fitWidth, onClick: () => { setFitWidth(true); setZoom(1) } }, t('fit')),
                h('button', { type: 'button', className: 'dshEndnotePdf_btn', title: t('zoomOut'), 'aria-label': t('zoomOut'), onClick: () => stepZoom(-1) }, '−'),
                h('span', { className: 'dshEndnotePdf_settingValue' }, fitWidth ? t('fit') : Math.round(zoom * 100) + '%'),
                h('button', { type: 'button', className: 'dshEndnotePdf_btn', title: t('zoomIn'), 'aria-label': t('zoomIn'), onClick: () => stepZoom(1) }, '+'),
              ),
              h('div', { className: 'dshEndnotePdf_settingRow' },
                h('span', { className: 'dshEndnotePdf_settingLabel' }, t('fontSizeLabel')),
                FONT_SCALES.map((scale, index) => h('button', {
                  key: 'font-' + scale,
                  type: 'button',
                  className: 'dshEndnotePdf_btn',
                  'data-active': Math.abs(ui.fontScale - scale) < 0.001,
                  onClick: () => pickFontScale(scale),
                }, t(FONT_SIZE_LABELS[index]))),
              ),
              h('div', { className: 'dshEndnotePdf_settingRow' },
                h('span', { className: 'dshEndnotePdf_settingLabel' }, t('boxFillLabel')),
                BOX_FILLS.map((fill, index) => h('button', {
                  key: 'fill-' + fill,
                  type: 'button',
                  className: 'dshEndnotePdf_btn',
                  'data-active': ui.boxFill === fill,
                  onClick: () => pickBoxFill(fill),
                }, t(BOX_FILL_LABELS[index]))),
              ),
              h('div', { className: 'dshEndnotePdf_settingRow' },
                h('span', { className: 'dshEndnotePdf_settingLabel' }, t('highlightColorLabel')),
                createColorPicker(ui.highlightColor, pickHighlightColor),
              ),
              h('div', { className: 'dshEndnotePdf_settingRow' },
                h('span', { className: 'dshEndnotePdf_settingLabel' }, t('boxColorLabel')),
                createColorPicker(ui.boxColor, pickBoxColor),
              ),
              h('div', { className: 'dshEndnotePdf_settingRow' },
                h('span', { className: 'dshEndnotePdf_settingLabel' }, t('noteColorLabel')),
                createColorPicker(ui.noteColor, pickNoteColor),
              ),
              h('div', { className: 'dshEndnotePdf_settingRow' },
                h('label', { className: 'dshEndnotePdf_settingCheck' },
                  h('input', { type: 'checkbox', checked: ui.showSaved, onChange: () => toggleUi('showSaved') }),
                  h('span', null, t('showSavedLabel')),
                ),
              ),
            ) : null,
          ),
          h('span', { className: 'dshEndnotePdf_sep' }),
          h('button', {
            type: 'button',
            className: 'dshEndnotePdf_btn',
            title: t('save') + ' (Ctrl+S)',
            disabled: saving || !pdfPath || !dirtyFlag,
            onClick: () => saveSoon(),
          }, saving ? t('saving') : t('save')),
          h('button', {
            type: 'button',
            className: 'dshEndnotePdf_btn',
            disabled: exporting,
            onClick: () => { void exportPdf() },
          }, exporting ? t('exporting') : t('export')),
          exportInfo ? h('button', {
            type: 'button',
            className: 'dshEndnotePdf_btn',
            onClick: () => { void openExportFolder() },
          }, t('openFolder')) : null,
          h('span', { className: 'dshEndnotePdf_sep' }),
          iconButton('hint', 'info', t('hintToggle'), { 'data-off': !ui.hint, onClick: () => toggleUi('hint') }),
          iconButton('listToggle', 'list', t('listToggle'), { 'data-off': !ui.list, onClick: () => toggleUi('list') }),
          iconButton('marks', 'tag', t('marksToggle'), { 'data-off': !ui.marks, onClick: () => toggleUi('marks') }),
          iconButton('find', 'find', t('find') + ' (Ctrl+F)', {
            'data-active': findOpen,
            onClick: () => {
              setFindOpen((open) => {
                if (!open) setTimeout(() => { if (findInputRef.current) findInputRef.current.focus() }, 0)
                return !open
              })
            },
          }),
          h('span', { className: 'dshEndnotePdf_meta' }, String(total)),
          status && ui.showSaved ? h('span', { className: 'dshEndnotePdf_status', 'data-tone': statusTone }, status.text) : null,
        ),
        findOpen ? h('div', { className: 'dshEndnotePdf_findBar' },
          h('input', {
            ref: findInputRef,
            type: 'search',
            value: findQuery,
            placeholder: t('findPlaceholder'),
            onChange: (event) => setFindQuery(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                stepFind(event.shiftKey ? -1 : 1)
              } else if (event.key === 'Escape') {
                setFindOpen(false)
              }
            },
          }),
          h('button', { type: 'button', className: 'dshEndnotePdf_btn', disabled: findState.matches.length === 0, onClick: () => stepFind(-1) }, t('findPrev')),
          h('button', { type: 'button', className: 'dshEndnotePdf_btn', disabled: findState.matches.length === 0, onClick: () => stepFind(1) }, t('findNext')),
          h('span', { className: 'dshEndnotePdf_meta' },
            findState.busy
              ? t('findIndexing')
              : findState.matches.length === 0
                ? (normalizeFindText(findQuery) ? t('findNone') : '')
                : (findState.current + 1) + ' / ' + findState.matches.length,
          ),
          h('button', { type: 'button', className: 'dshEndnotePdf_btn', title: 'Esc', onClick: () => setFindOpen(false) }, '×'),
        ) : null,
        annotations.length === 0 || !ui.list ? null : h('div', { className: 'dshEndnotePdf_list' },
          h('div', { className: 'dshEndnotePdf_listHead' },
            h('span', null, t('listTitle') + ' ' + total),
            h('button', {
              type: 'button',
              className: 'dshEndnotePdf_listHide',
              title: t('hideList'),
              'aria-label': t('hideList'),
              onClick: () => toggleUi('list'),
            }, '×'),
          ),
          annotations.map((annotation) => h('div', {
            key: annotation.id,
            className: 'dshEndnotePdf_row',
            'data-active': annotation.id === selectedId,
            onClick: () => {
              setSelectedId(annotation.id)
              goToPage(annotation.page || 1)
            },
          },
            h('span', { className: 'dshEndnotePdf_rowDot', style: { background: annotation.color || '#ffe066' } }),
            h('span', { className: 'dshEndnotePdf_rowMeta' }, (annotation.page || 1) + ' ' + t('pages')),
            h('span', { className: 'dshEndnotePdf_rowText' }, annotationLabel(annotation, t)),
            h('button', {
              type: 'button',
              className: 'dshEndnotePdf_btn',
              title: t('remove'),
              onClick: (event) => { event.stopPropagation(); removeAnnotation(annotation.id) },
            }, '×'),
          )),
        ),
        error !== null
          ? h('p', { className: 'dshEndnotePdf_hint', role: 'alert' }, t('openFailed') + error)
          : doc === null
            ? h('p', { className: 'dshEndnotePdf_hint' }, t('loading'))
            : h('div', { className: 'dshEndnotePdf_scroll', ref: attachScroll, onScroll },
              ui.hint ? h('p', { className: 'dshEndnotePdf_hint', style: { padding: '0 0 12px' } }, t('hint')) : null,
              Array.from({ length: pageCount }, (_, index) => {
                const pageNumber = index + 1
                return h('div', {
                  key: pageNumber,
                  'data-page': pageNumber,
                  ref: (element) => {
                    const previous = pageRefs.current.get(pageNumber)
                    if (previous && previous !== element && pageObserverRef.current) {
                      pageObserverRef.current.unobserve(previous)
                    }
                    if (element) {
                      pageRefs.current.set(pageNumber, element)
                      if (pageObserverRef.current) pageObserverRef.current.observe(element)
                    } else {
                      pageRefs.current.delete(pageNumber)
                    }
                  },
                },
                  h(PdfPageView, {
                    doc,
                    pageNumber,
                    t,
                    tool: panMode ? 'pan' : tool,
                    color,
                    width: pageWidth,
                    active: activePages === null || activePages.has(pageNumber),
                    pageHeight: Math.round(pageWidth * (pageSizes[pageNumber] || 1.414)),
                    findMarks: findByPage.get(pageNumber) || [],
                    fontScale: ui.fontScale,
                    boxFill: ui.boxFill,
                    annotations: byPage.get(pageNumber) || [],
                    selectedId,
                    onColor: pickColor,
                    onAdd: addAnnotation,
                    onUpdate: updateAnnotation,
                    onRemove: removeAnnotation,
                    onSelect: setSelectedId,
                    hideMarks: !ui.marks,
                    onError: (cause) => setError(cause instanceof Error ? cause.message : String(cause)),
                  }),
                )
              }),
            ),
      )
    }

    /** 标注列表里的一行摘要。 */
    function annotationLabel(annotation, t) {
      if (annotation.note) return annotation.note
      if (annotation.text) return annotation.text
      if (annotation.type === 'highlight') return t('highlight')
      if (annotation.type === 'underline') return t('underline')
      if (annotation.type === 'strike') return t('strike')
      return t('rect')
    }

    /** 页码文案：未打开文档时只显示请求页。 */
    function samplePage(current, total) {
      if (!total) return String(current)
      return current + ' / ' + total
    }

    /** 注册 PDF 编辑器：预览器元数据 + 文档主体 + 字典。 */
    function registerPdfEditor(ctx) {
      if (!React) {
        console.warn('[' + PLUGIN + '] 缺少 React，PDF 编辑器不可用')
        return
      }
      const get = (name) => (typeof ctx.get === 'function' ? ctx.get(name) : undefined)
      const previews = get('documentPreviews')
      const slots = get('slots')
      const locale = get('locale')
      if (!previews || typeof previews.register !== 'function') {
        // 旧版宿主没有 documentPreviews：保持内置只读预览，不报错。
        return
      }
      if (!slots || typeof slots.register !== 'function' || typeof slots.inject !== 'function') {
        console.warn('[' + PLUGIN + '] 缺少 slots，PDF 编辑器不可用')
        return
      }
      ensurePdfCss()

      const mount = () => {
        if (locale && typeof locale.register === 'function') {
          ctx.effect(() => locale.register(PDF_NS, PDF_TEXT))
        }
        ctx.effect(() => previews.register({
          id: PDF_EDITOR_ID,
          extensions: ['pdf'],
          binaryExtensions: ['pdf'],
          priority: 'extension',
          title: () => 'EndNote PDF',
          loading: 'bytes-complete',
          wrap: false,
        }), 'dsh-endnote: pdf renderer')
        ctx.effect(() => slots.inject('sidebar.right.tab.document', () => slots.register({
          name: 'sidebar.right.tab.document',
          key: PDF_EDITOR_ID,
          locale: PDF_NS,
        }, EndnotePdfBody)), 'dsh-endnote: pdf body')
      }

      // 先确认 vendor/pdfjs 能被同源路由取到；取不到就让内置预览继续工作，
      // 避免「插件装了但所有 PDF 都打不开」这种更糟的降级。
      if (typeof fetch !== 'function' || typeof location === 'undefined') {
        mount()
        return
      }
      const probe = new URL(PDF_VENDOR + 'build/pdf.min.mjs', location.origin + '/').href
      fetch(probe, { method: 'HEAD', credentials: 'same-origin' })
        .then((response) => {
          if (response.ok) mount()
          else console.warn('[' + PLUGIN + '] PDF 编辑器资源不可用（HTTP ' + response.status + '），继续使用内置预览')
        })
        .catch((error) => {
          console.warn('[' + PLUGIN + '] PDF 编辑器资源探测失败，继续使用内置预览', error)
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

        // PDF 编辑器：documentPreviews 是 0.2.x 的公开扩展点。
        // 旧宿主没有该服务时 ctx.inject 不会触发；vendor 缺失时探测失败也不注册，
        // 两种情况都保持内置只读预览，不会出现「PDF 打不开」。
        try {
          if (typeof ctx.inject === 'function') {
            const handle = ctx.inject(['documentPreviews', 'slots', 'locale'], (child) => {
              registerPdfEditor(child)
            })
            ctx.effect(() => () => {
              try {
                if (handle && typeof handle.dispose === 'function') handle.dispose()
                else if (typeof handle === 'function') handle()
              } catch (error) {
                console.warn('[' + PLUGIN + '] PDF 编辑器清理失败', error)
              }
            })
          }
        } catch (error) {
          console.warn('[' + PLUGIN + '] PDF 编辑器注册失败', error)
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
