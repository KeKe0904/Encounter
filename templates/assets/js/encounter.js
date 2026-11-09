/* Encounter for Halo —— 交互脚本
 * 逐项对应原版组件：
 *   ThemeManager / ThemeToggle  → 深色模式
 *   GradientMask                → 顶部滚动遮罩
 *   TableOfContents             → 目录构建与高亮
 *   CopyCode                    → 代码块复制按钮
 *   ImageViewer                 → 图片查看器
 */
;(function () {
  'use strict'

  /* ---------------- 深色模式（ThemeManager） ---------------- */
  var THEME_KEY = 'encounter-theme'

  function applyTheme(theme, persist) {
    var root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme)
      } catch (e) {}
    }
  }

  function initTheme() {
    var saved = null
    try {
      saved = localStorage.getItem(THEME_KEY)
    } catch (e) {}
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light', false)

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      var current = null
      try {
        current = localStorage.getItem(THEME_KEY)
      } catch (err) {}
      if (!current) applyTheme(e.matches ? 'dark' : 'light', false)
    })

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark', true)
        syncSearchWidgetTheme()
      })
    })
  }

  /* ---------------- 顶部滚动遮罩（GradientMask） ---------------- */
  function isMobileSafari() {
    var ua = navigator.userAgent
    var platform = navigator.platform
    var isIOS = /iP(ad|hone|od)/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (!isIOS) return false
    var isSafari = /Safari\//.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/.test(ua)
    if (!isSafari) return false
    var mobileLike =
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      window.matchMedia('(max-width: 768px)').matches
    return Boolean(mobileLike)
  }

  function initGradientMask() {
    var mask = document.createElement('div')
    mask.className = 'gradient-mask'
    mask.setAttribute('aria-hidden', 'true')
    var blur = document.createElement('div')
    blur.className = 'gradient-mask__blur'
    var bg = document.createElement('div')
    bg.className = 'gradient-mask__background'
    mask.appendChild(blur)
    mask.appendChild(bg)

    if (isMobileSafari()) {
      mask.style.display = 'none'
      document.body.appendChild(mask)
      return
    }
    document.body.appendChild(mask)

    var ticking = false
    function update() {
      mask.style.opacity = window.scrollY >= 64 ? '1' : '0'
    }
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(function () {
        update()
        ticking = false
      })
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  /* ---------------- 目录（TableOfContents） ---------------- */
  function initToc() {
    var list = document.getElementById('toc-list')
    var content = document.querySelector('.post-container .content')
    var container = document.getElementById('toc')
    if (!list || !content || !container) return

    var headings = Array.prototype.slice.call(content.querySelectorAll('h2, h3'))
    if (!headings.length) {
      container.style.display = 'none'
      return
    }

    headings.forEach(function (h, i) {
      if (!h.id) h.id = 'heading-' + i
      var level = h.tagName === 'H2' ? 1 : 2
      var li = document.createElement('li')
      li.className = 'toc-item toc-level-' + level
      var a = document.createElement('a')
      a.href = '#' + h.id
      a.className = 'toc-link'
      a.setAttribute('data-text', h.textContent.trim())
      a.title = h.textContent.trim()
      li.appendChild(a)
      list.appendChild(li)
    })

    function syncPosition() {
      var wide = window.innerWidth > 1024
      if (wide) {
        container.style.display = 'block'
        container.classList.add('fixed-position')
        var prose = document.querySelector('.prose')
        if (prose) {
          var proseLeft = prose.getBoundingClientRect().left
          var tocWidth = container.getBoundingClientRect().width
          container.style.left = Math.max(16, proseLeft - tocWidth - 24) + 'px'
        }
      } else {
        container.style.display = 'none'
        container.classList.remove('fixed-position')
      }
    }
    syncPosition()
    window.addEventListener('resize', syncPosition)

    var links = Array.prototype.slice.call(list.querySelectorAll('.toc-link'))
    var map = {}
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1))
      if (id) map[id] = a
    })

    var titleLink = list.querySelector('.toc-title')
    if (titleLink) {
      titleLink.addEventListener('click', function (e) {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var link = map[entry.target.id]
            if (!link) return
            if (entry.isIntersecting) {
              links.forEach(function (a) {
                a.classList.remove('active')
              })
              link.classList.add('active')
            }
          })
        },
        { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
      )
      headings.forEach(function (h) {
        observer.observe(h)
      })
    }
  }

  /* ---------------- 代码复制（CopyCode） ---------------- */
  var COPY_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>'
  var COPIED_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>'

  function initCopyCode() {
    var pres = document.querySelectorAll('.post-container .content pre')
    pres.forEach(function (pre) {
      if (pre.dataset.copyInit) return
      pre.dataset.copyInit = '1'

      var wrapper = pre.parentElement
      if (!wrapper || !wrapper.classList.contains('copy-code-wrapper')) {
        var created = document.createElement('div')
        created.className = 'copy-code-wrapper'
        pre.parentNode.insertBefore(created, pre)
        created.appendChild(pre)
        wrapper = created
      }

      var button = document.createElement('button')
      button.className = 'copy-button'
      button.type = 'button'
      button.setAttribute('aria-label', '复制代码')
      button.dataset.copyState = 'idle'
      button.innerHTML = COPY_ICON
      wrapper.appendChild(button)

      var timer = null
      button.addEventListener('click', function () {
        var code = pre.querySelector('code') || pre
        navigator.clipboard.writeText(code.innerText).then(function () {
          window.clearTimeout(timer)
          button.dataset.copyState = 'copied'
          button.innerHTML = COPIED_ICON
          timer = window.setTimeout(function () {
            button.dataset.copyState = 'idle'
            button.innerHTML = COPY_ICON
          }, 1500)
        })
      })
    })
  }

  /* ---------------- 图片查看器（ImageViewer） ----------------
     覆盖文章正文与瞬间图片；同一组图片可用 ←/→ 翻看，不跳新窗口 */
  function initImageViewer() {
    var images = Array.prototype.slice.call(
      document.querySelectorAll('.post-container .content img, .moment-content img, .moment-media img')
    )
    if (!images.length) return

    var viewer = null
    var bigImg = null
    var group = []
    var index = 0

    // 懒创建：不打开时不往 DOM 里放容器，
    // 否则 backdrop-filter 会在部分浏览器里留下一块异常底色
    function ensureViewer() {
      if (viewer) return viewer
      viewer = document.createElement('div')
      viewer.className = 'image-viewer'
      bigImg = document.createElement('img')
      viewer.appendChild(bigImg)
      document.body.appendChild(viewer)

      viewer.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'opacity' && !viewer.classList.contains('active')) {
          bigImg.removeAttribute('src')
        }
      })
      viewer.addEventListener('click', close)
      return viewer
    }

    function show(i) {
      if (!group.length) return
      index = (i + group.length) % group.length
      var img = group[index]
      bigImg.src = img.currentSrc || img.src
    }

    function open(img) {
      var scope = img.closest('.moment-media')
      group = scope ? Array.prototype.slice.call(scope.querySelectorAll('img')) : [img]
      ensureViewer()
      show(Math.max(0, group.indexOf(img)))
      viewer.classList.add('active')
      document.body.classList.add('image-viewer-open')
    }

    function close() {
      if (!viewer) return
      viewer.classList.remove('active')
      document.body.classList.remove('image-viewer-open')
    }

    document.addEventListener('keydown', function (e) {
      if (!viewer || !viewer.classList.contains('active')) return
      if (e.key === 'Escape') {
        close()
        return
      }
      if (group.length < 2) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        show(index - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        show(index + 1)
      }
    })

    images.forEach(function (img) {
      img.setAttribute('data-preview', 'true')
      img.addEventListener('click', function (e) {
        if (img.closest('a')) e.preventDefault()
        open(img)
      })
    })
  }

  /* ---------------- 评论区 ----------------
     注意：Halo 评论组件用 IntersectionObserver 懒挂载，
     只有评论区滚进视口才会注入内容，所以这里不能用固定超时收尾。 */
  function initComments() {
    var wrap = document.querySelector('.encounter-comments')
    if (!wrap) return
    var target = wrap.querySelector('div[id^="comment-content-"]')
    if (!target) return

    wrap.classList.add('is-loading')

    var done = false
    function settle() {
      if (done) return
      done = true
      wrap.classList.remove('is-loading')
      target.classList.add('is-ready')
      window.clearInterval(timer)
    }

    // 只要组件注入完成就收尾
    var timer = window.setInterval(function () {
      if (target.children.length > 0) window.setTimeout(settle, 120)
    }, 120)

    // 兜底：20 秒后强制收尾，避免评论区不可用时骨架一直转
    window.setTimeout(settle, 20000)
  }

  /* View Transition 只在安全上下文（https / localhost）可用 */
  function markTransitionSupport() {
    var root = document.documentElement
    var ok = window.isSecureContext && window.CSS && CSS.supports && CSS.supports('view-transition-name', 'none')
    if (!ok) root.classList.add('no-vt')
  }

  /* ---------------- 阅读时长 ---------------- */
  function initReadingTime() {
    if (document.body.getAttribute('data-reading-time') !== 'true') return
    var content = document.querySelector('.post-container .content')
    var dateBox = document.querySelector('.post-container .title .date')
    if (!content || !dateBox) return
    var text = content.innerText || ''
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    var words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length
    var minutes = Math.max(1, Math.round(cjk / 500 + words / 200))
    var span = document.createElement('span')
    span.className = 'reading-time'
    span.innerHTML = '<span class="separator">·</span> 约 ' + minutes + ' 分钟读完'
    dateBox.appendChild(span)
  }

  /* 读取模板写入 body 的功能开关 */
  function readFlags() {
    var d = document.body.dataset || {}
    return {
      fade: d.fade !== 'false',
      toc: d.toc !== 'false',
      copy: d.copy !== 'false',
      viewer: d.viewer !== 'false',
      katex: d.katex !== 'false'
    }
  }

  /* ---------------- 数学公式（KaTeX） ----------------
     $$...$$ 按块级元素单独渲染；其余行内公式交给 auto-render。
     跳过 pre/code，避免把代码里的 $ 当公式。 */
  function initMath() {
    var content = document.querySelector('.post-container .content')
    if (!content) return
    var raw = content.textContent || ''
    if (raw.indexOf('$') === -1 && raw.indexOf('\\(') === -1 && raw.indexOf('\\[') === -1) return

    var link = document.querySelector('link[href*="/assets/css/"]')
    var base = '/assets/js/'
    if (link) base = link.href.split('?')[0].replace(/css\/[^/]+$/, 'js/')

    function load(src) {
      return new Promise(function (resolve, reject) {
        if (document.querySelector('script[src="' + src + '"]')) return resolve()
        var s = document.createElement('script')
        s.src = src
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }

    function renderBlockMath() {
      var blocks = content.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6')
      Array.prototype.forEach.call(blocks, function (el) {
        if (el.closest('pre') || el.closest('code')) return
        if (el.textContent.indexOf('$$') === -1) return
        for (var i = 0; i < el.childNodes.length; i++) {
          if (el.childNodes[i].nodeType === 1) return // 含子元素，跳过以免破坏结构
        }
        var next = el.innerHTML.replace(/\$\$([\s\S]+?)\$\$/g, function (m, tex) {
          var box = document.createElement('div')
          try {
            window.katex.render(tex.trim(), box, { displayMode: true, throwOnError: false })
          } catch (e) {
            return m
          }
          box.className = 'math-display'
          return box.outerHTML
        })
        if (next !== el.innerHTML) el.innerHTML = next
      })
    }

    load(base + 'katex.min.js')
      .then(function () { return load(base + 'auto-render.min.js') })
      .then(function () {
        if (!window.katex) return
        renderBlockMath()
        if (!window.renderMathInElement) return
        window.renderMathInElement(content, {
          delimiters: [
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
          ],
          ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
          throwOnError: false
        })
      })
      .catch(function () {})
  }

  /* ---------------- 首页简介（对应原版 About 组件） ----------------
     纯文本按空行/换行拆成段落；主人自己写了 HTML 就原样保留 */
  function initIntro() {
    var box = document.querySelector('.about')
    if (!box) return
    if (box.children.length > 0) return
    var text = (box.textContent || '').trim()
    if (!text) return
    var lines = text.split(/\n+/).map(function (l) { return l.trim() }).filter(Boolean)
    if (lines.length === 0) return
    box.innerHTML = ''
    lines.forEach(function (line) {
      var p = document.createElement('p')
      p.textContent = line
      box.appendChild(p)
    })
  }

  /* 页脚年份 */
  /* ---------------- 首页一屏布局（ViewportFit） ----------------
   * 仅在「首页一屏显示」开启且当前是首页时启用：
   *   - 页面锁定为一屏高度，头部/简介/分页/页脚固定
   *   - 文章列表占满剩余高度，条目多时在列表内部滚动
   *   - 页脚徽章展开等场景自动解锁整页滚动
   */
  function initViewportFit() {
    var body = document.body
    if (!body || body.getAttribute('data-fit-viewport') !== 'true') return

    var path = location.pathname.replace(/\/index\.html$/, '/')
    if (path !== '/') return

    body.classList.add('enc-home')

    function unlock() {
      body.classList.add('enc-scroll-unlocked')
    }

    /* 页脚徽章展开后页面需要变高，恢复整页滚动 */
    var wall = document.getElementById('enc-beian-wall')
    if (wall) {
      var mo = new MutationObserver(function () {
        if (wall.classList.contains('enc-gate-shown')) {
          unlock()
          mo.disconnect()
        }
      })
      mo.observe(wall, { attributes: true, attributeFilter: ['class'] })
    }
  }

  function initFooterYear() {
    var el = document.querySelector('.copyright-year')
    if (el) el.textContent = new Date().getFullYear()
  }

  /* ---------------- 搜索入口（适配 Halo 搜索插件 PluginSearchWidget） ----------------
     插件会自动往 body 插一个 <search-modal>，并暴露 window.SearchWidget.open() */
  function initSearch() {
    var btn = document.querySelector('[data-search-open]')
    if (!btn) return

    function openSearch() {
      if (window.SearchWidget && typeof window.SearchWidget.open === 'function') {
        window.SearchWidget.open({})
        return true
      }
      return false
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault()
      if (openSearch()) return
      // 插件脚本是 defer 加载的，偶尔还没就绪，短轮询等它
      var tries = 0
      var timer = window.setInterval(function () {
        if (openSearch()) { window.clearInterval(timer); return }
        if (++tries > 20) window.clearInterval(timer)
      }, 150)
    })

    // Ctrl/Cmd + K 快捷键
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        openSearch()
      }
    })
  }

  /* 搜索组件在 shadow DOM 里自带一套深色变量，继承值会被覆盖，
     只能在宿主元素上写内联变量（优先级最高）来对齐主题色 */
  function syncSearchWidgetTheme() {
    var modal = document.querySelector('search-modal')
    if (!modal) return false
    var root = getComputedStyle(document.documentElement)
    var get = function (name, fallback) {
      var v = root.getPropertyValue(name).trim()
      return v || fallback
    }
    var bg = get('--bg', '#ffffff')
    var text = get('--text-primary', '#111111')
    var secondary = get('--text-secondary', 'rgba(0,0,0,.55)')
    var tertiary = get('--text-tertiary', 'rgba(0,0,0,.25)')
    var border = get('--border', 'rgba(0,0,0,.1)')

    modal.style.setProperty('--halo-search-widget-base-bg-color', bg)
    modal.style.setProperty('--halo-search-widget-modal-bg-color', bg)
    modal.style.setProperty('--halo-search-widget-color-modal-content-bg', bg)
    modal.style.setProperty('--halo-search-widget-color-modal-layer', 'rgba(0,0,0,0.5)')
    modal.style.setProperty('--halo-search-widget-primary-color', text)
    modal.style.setProperty('--halo-search-widget-content-color', text)
    modal.style.setProperty('--halo-search-widget-color-form-input', text)
    modal.style.setProperty('--halo-search-widget-muted-color', secondary)
    modal.style.setProperty('--halo-search-widget-divider-color', border)
    modal.style.setProperty('--halo-search-widget-color-form-divider', border)
    modal.style.setProperty('--halo-search-widget-hit-bg-color', border)
    modal.style.setProperty('--halo-search-widget-color-result-item-bg', border)
    modal.style.setProperty('--halo-search-widget-kbd-border-color', border)
    modal.style.setProperty('--halo-search-widget-color-command-kbd-border', border)
    return true
  }

  function syncSearchWidgetThemeWithRetry() {
    if (syncSearchWidgetTheme()) return
    var tries = 0
    var timer = window.setInterval(function () {
      if (syncSearchWidgetTheme() || ++tries > 20) window.clearInterval(timer)
    }, 150)
  }

  /* ---------------- 移动端输入框防缩放 ----------------
     iOS Safari 在聚焦字号 < 16px 的输入框时会自动放大页面。
     搜索/评论组件在 shadow DOM 里，外部 CSS 进不去，
     所以在 focusin 时把字号兜到 16px（只影响聚焦那一刻的显示） */
  function preventMobileInputZoom() {
    function bump(el) {
      if (!el || !el.tagName) return
      var tag = el.tagName.toLowerCase()
      var editable = el.isContentEditable ||
        el.getAttribute('contenteditable') !== null ||
        el.getAttribute('role') === 'textbox'
      if (tag !== 'input' && tag !== 'textarea' && !editable) return
      if (window.innerWidth > 768) return
      var fs = parseFloat(window.getComputedStyle(el).fontSize) || 0
      if (fs > 0 && fs < 16) el.style.fontSize = '16px'
    }

    document.addEventListener('focusin', function (e) {
      var path = e.composedPath ? e.composedPath() : [e.target]
      bump(path[0])
    }, true)

    // 兼容不支持 composedPath 的环境：给已知组件的 shadowRoot 单独挂
    function bindShadow(el) {
      if (!el || !el.shadowRoot || el.shadowRoot.__zoomBound) return
      el.shadowRoot.__zoomBound = true
      el.shadowRoot.addEventListener('focusin', function (e) { bump(e.target) }, true)
    }
    var tries = 0
    var timer = window.setInterval(function () {
      document.querySelectorAll('search-modal, comment-widget').forEach(bindShadow)
      if (++tries > 20) window.clearInterval(timer)
    }, 300)
  }

  /* ---------------- 右上角天气（按访客 IP 定位） ----------------
     定位：ipinfo.io（免费、无密钥、CORS 开放）
     天气：Open-Meteo（免费、无密钥、CORS 开放）
     结果缓存 30 分钟，失败则整体隐藏，不占位不报错 */
  var WEATHER_ICONS = {
    day: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="2.5" stroke="currentColor" stroke-width="1.1"/><path d="M6 1v1.3M6 9.7V11M1 6h1.3M9.7 6H11M2.5 2.5l.9.9M8.6 8.6l.9.9M9.5 2.5l-.9.9M3.4 8.6l-.9.9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
    night: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.4 7.6A4.2 4.2 0 0 1 4.4 2.6a4.4 4.4 0 1 0 5 5Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
    cloud: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.4 8.3h5.2a1.8 1.8 0 0 0 .1-3.6 2.6 2.6 0 0 0-4.9-.5 1.8 1.8 0 0 0-.4 4.1Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
    rain: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.4 7.6h5.2a1.8 1.8 0 0 0 .1-3.6 2.6 2.6 0 0 0-4.9-.5 1.8 1.8 0 0 0-.4 4.1Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M4.3 9.1l-.5 1.2M7.3 9.1l-.5 1.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
    snow: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.4 7.6h5.2a1.8 1.8 0 0 0 .1-3.6 2.6 2.6 0 0 0-4.9-.5 1.8 1.8 0 0 0-.4 4.1Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M4.4 9.6v1.2M7.2 9.6v1.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    thunder: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.4 7.3h5.2a1.8 1.8 0 0 0 .1-3.6 2.6 2.6 0 0 0-4.9-.5 1.8 1.8 0 0 0-.4 4.1Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M6.4 8.4L5 10.4h1.7l-.4 1.4" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
    fog: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.4 4.4h7.2M1.6 6.4h8.8M2.8 8.4h6.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>'
  }

  function weatherKind(code, isDay) {
    if (code === 0) return isDay ? 'day' : 'night'
    if (code === 1 || code === 2) return isDay ? 'day' : 'night'
    if (code === 3) return 'cloud'
    if (code === 45 || code === 48) return 'fog'
    if (code >= 51 && code <= 57) return 'rain'
    if (code >= 61 && code <= 67) return 'rain'
    if (code >= 71 && code <= 77) return 'snow'
    if (code >= 80 && code <= 82) return 'rain'
    if (code === 85 || code === 86) return 'snow'
    if (code >= 95) return 'thunder'
    return 'cloud'
  }

  function weatherText(code) {
    if (code === 0) return '晴'
    if (code === 1) return '大部晴朗'
    if (code === 2) return '多云'
    if (code === 3) return '阴'
    if (code === 45 || code === 48) return '雾'
    if (code >= 51 && code <= 57) return '毛毛雨'
    if (code >= 61 && code <= 67) return '雨'
    if (code >= 71 && code <= 77) return '雪'
    if (code >= 80 && code <= 82) return '阵雨'
    if (code === 85 || code === 86) return '阵雪'
    if (code >= 95) return '雷雨'
    return '天气'
  }

  function initWeather() {
    var box = document.querySelector('[data-weather]')
    if (!box) return
    var iconEl = box.querySelector('[data-weather-icon]')
    var tempEl = box.querySelector('[data-weather-temp]')

    function paint(data) {
      if (!data || typeof data.temp !== 'number') return
      if (iconEl) iconEl.innerHTML = WEATHER_ICONS[weatherKind(data.code, data.isDay)] || WEATHER_ICONS.cloud
      if (tempEl) tempEl.textContent = Math.round(data.temp) + '°'
      box.title = (data.city ? data.city + ' · ' : '') + weatherText(data.code) + ' ' + data.temp.toFixed(1) + '°C'
      box.hidden = false
    }

    // 30 分钟缓存，避免每次翻页都打接口
    try {
      var cached = JSON.parse(sessionStorage.getItem('encounter-weather') || 'null')
      if (cached && Date.now() - cached.t < 30 * 60 * 1000) { paint(cached); return }
    } catch (e) {}

    function getJSON(url) {
      return new Promise(function (resolve, reject) {
        var ctl = window.AbortController ? new AbortController() : null
        var timer = window.setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('timeout')) }, 6000)
        fetch(url, ctl ? { signal: ctl.signal } : {})
          .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() })
          .then(function (j) { window.clearTimeout(timer); resolve(j) })
          .catch(function (e) { window.clearTimeout(timer); reject(e) })
      })
    }

    getJSON('https://ipinfo.io/json')
      .then(function (geo) {
        if (!geo || !geo.loc) throw new Error('no loc')
        var parts = String(geo.loc).split(',')
        var lat = parts[0], lon = parts[1]
        return getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
          '&current=temperature_2m,weather_code,is_day&timezone=auto')
          .then(function (w) {
            var cur = w && w.current
            if (!cur) throw new Error('no current')
            var data = {
              t: Date.now(),
              temp: Number(cur.temperature_2m),
              code: Number(cur.weather_code),
              isDay: Number(cur.is_day) === 1,
              city: geo.city || geo.region || ''
            }
            try { sessionStorage.setItem('encounter-weather', JSON.stringify(data)) } catch (e) {}
            paint(data)
          })
      })
      .catch(function () { /* 静默失败：不显示，不占位 */ })
  }

  /* ---------------- 站内导航面板（Halo 主菜单） ----------------
     入口是页头汉堡按钮，交互与搜索弹窗保持一致：
     遮罩点击 / Esc 关闭，↑↓ 在多条链接间移动 */
  function initMenu() {
    var trigger = document.querySelector('[data-menu-open]')
    var modal = document.querySelector('[data-menu-modal]')
    if (!trigger || !modal) return

    var lastFocus = null

    function links() {
      return Array.prototype.slice.call(modal.querySelectorAll('.menu-link'))
    }

    function open() {
      lastFocus = document.activeElement
      modal.hidden = false
      document.body.classList.add('menu-open')
      var first = links()[0]
      if (first) first.focus()
    }

    function close() {
      if (modal.hidden) return
      modal.hidden = true
      document.body.classList.remove('menu-open')
      if (lastFocus && lastFocus.focus) lastFocus.focus()
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault()
      if (modal.hidden) open()
      else close()
    })

    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-menu-close]')) close()
    })

    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return
      if (e.key === 'Escape') { e.preventDefault(); close(); return }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        var list = links()
        if (!list.length) return
        var idx = list.indexOf(document.activeElement)
        var next = e.key === 'ArrowDown' ? (idx + 1) % list.length : (idx - 1 + list.length) % list.length
        if (idx === -1) next = 0
        list[next].focus()
      }
    })
  }

  /* ---------------- 瞬间：评论展开 ---------------- */
  function initMoments() {
    // 瞬间时间按访客本地时区显示
    var times = document.querySelectorAll('.moment-time[data-time]')
    Array.prototype.forEach.call(times, function (el) {
      var raw = el.getAttribute('data-time')
      if (!raw) return
      var d = new Date(raw)
      if (isNaN(d.getTime())) return
      var p2 = function (n) { return n < 10 ? '0' + n : '' + n }
      el.textContent = d.getFullYear() + '.' + p2(d.getMonth() + 1) + '.' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes())
    })

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-moment-comment]')
      if (!btn) return
      var article = btn.closest('.moment')
      if (!article) return
      var box = article.querySelector('.moment-comments')
      if (!box) return
      e.preventDefault()
      box.hidden = !box.hidden
      btn.classList.toggle('is-open', !box.hidden)
    })
  }

  /* ---------------- 点赞 / 评论权限 ----------------
     权限在主题设置里分开配置（所有人 / 仅登录用户）。
     登录态用 /users/- 探测：未登录会返回 anonymousUser。 */
  function initInteractions() {
    var likes = Array.prototype.slice.call(document.querySelectorAll('[data-upvote]'))
    var gates = Array.prototype.slice.call(document.querySelectorAll('[data-comment-gate]'))
    if (!likes.length && !gates.length) return

    var isGuest = true

    function applyGate(guest) {
      gates.forEach(function (gate) {
        var widget = gate.parentElement ? gate.parentElement.querySelector('.comment-widget') : null
        if (guest) {
          gate.hidden = false
          if (widget) widget.style.display = 'none'
        } else {
          gate.hidden = true
          if (widget) widget.style.display = ''
        }
      })
    }

    likes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('data-require-login') === 'true' && isGuest) {
          window.location.href = '/login'
          return
        }
        if (btn.classList.contains('is-active') || btn.getAttribute('data-busy')) return
        btn.setAttribute('data-busy', '1')
        var payload = {
          group: btn.getAttribute('data-group') || '',
          plural: btn.getAttribute('data-plural') || 'posts',
          name: btn.getAttribute('data-name')
        }
        fetch('/apis/api.halo.run/v1alpha1/trackers/upvote', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (r) {
            if (!r.ok) throw new Error('upvote failed')
            var count = btn.querySelector('[data-upvote-count]')
            if (count) count.textContent = (parseInt(count.textContent, 10) || 0) + 1
            btn.classList.add('is-active')
          })
          .catch(function () {})
          .then(function () { btn.removeAttribute('data-busy') })
      })
    })

    var needProbe = gates.length > 0 || likes.some(function (b) {
      return b.getAttribute('data-require-login') === 'true'
    })

    if (!needProbe) {
      isGuest = false
      applyGate(false)
      return
    }

    fetch('/apis/api.console.halo.run/v1alpha1/users/-', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (data) {
        var name = data && data.user && data.user.metadata ? data.user.metadata.name : ''
        isGuest = !name || name === 'anonymousUser'
        applyGate(isGuest)
      })
      .catch(function () {})
  }

  /* ---------------- 评论表单：只保留邮箱 ----------------
     评论组件在 shadow DOM 里，昵称/网站是必填或多余字段。
     这里把昵称、网站隐藏，提交前用邮箱前缀自动填昵称。 */
  function deepQuery(selector, root, depth) {
    var scope = root || document
    var level = depth || 0
    if (level > 6) return null
    var hit = scope.querySelector(selector)
    if (hit) return hit
    var all = scope.querySelectorAll('*')
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        var found = deepQuery(selector, all[i].shadowRoot, level + 1)
        if (found) return found
      }
    }
    return null
  }

  function initCommentForm() {
    var tries = 0
    var timer = window.setInterval(function () {
      var email = deepQuery('input[name="email"]')
      var nick = deepQuery('input[name="displayName"]')
      if (!email || !nick) {
        if (++tries > 60) window.clearInterval(timer)
        return
      }
      window.clearInterval(timer)

      // 邮箱标星号，明确表示必填
      email.setAttribute('required', 'required')
      email.title = '必填'
      if ((email.placeholder || '').indexOf('*') === -1) {
        email.placeholder = (email.placeholder || '电子邮件') + ' *'
      }

      // 昵称、网站保留展示，但不再强制填写（邮箱必填）
      var site = deepQuery('input[name="website"]')
      ;[nick, site].forEach(function (el) {
        if (!el) return
        el.removeAttribute('required')
      })

      var autoNick = ''
      var setValue = function (el, val) {
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(el, val)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }

      var sync = function () {
        var v = (email.value || '').trim()
        if (!v) return
        var prefix = v.indexOf('@') > 0 ? v.split('@')[0] : v
        if (!prefix) return
        if (!nick.value || nick.value === autoNick) {
          autoNick = prefix
          setValue(nick, prefix)
        }
      }

      email.addEventListener('input', sync)
      email.addEventListener('change', sync)
      email.addEventListener('blur', sync)
      document.addEventListener('click', function (e) {
        var t = e.target
        var label = ''
        if (t && t.closest) {
          var btn = t.closest('button')
          if (btn) label = btn.textContent || ''
        }
        if (/提交|发送|回复/.test(label)) sync()
      }, true)
    }, 300)
  }

  function boot() {
    var f = readFlags()
    markTransitionSupport()

    if (!f.fade) {
      document.documentElement.classList.add('no-anim')
      var st = document.createElement('style')
      st.textContent = '::view-transition-old(root),::view-transition-new(root){animation:none!important}@view-transition{navigation:none}'
      document.head.appendChild(st)
    }

    initIntro()
    initCommentForm()
    initInteractions()
    initMoments()
    initViewportFit()
    initMenu()
    initWeather()
    initSearch()
    preventMobileInputZoom()
    syncSearchWidgetThemeWithRetry()
    initFooterYear()
    initTheme()
    initGradientMask()
    if (f.toc) initToc()
    if (f.katex) initMath()
    if (f.copy) initCopyCode()
    if (f.viewer) initImageViewer()
    initReadingTime()
    initComments()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()