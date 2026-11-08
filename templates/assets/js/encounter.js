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

  /* ---------------- 图片查看器（ImageViewer） ---------------- */
  function initImageViewer() {
    var images = Array.prototype.slice.call(
      document.querySelectorAll('.post-container .content img')
    )
    if (!images.length) return

    var viewer = null
    var bigImg = null

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

    function close() {
      if (!viewer) return
      viewer.classList.remove('active')
      document.body.classList.remove('image-viewer-open')
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close()
    })

    images.forEach(function (img) {
      img.setAttribute('data-preview', 'true')
      img.addEventListener('click', function () {
        ensureViewer()
        bigImg.src = img.currentSrc || img.src
        viewer.classList.add('active')
        document.body.classList.add('image-viewer-open')
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
    span.innerHTML = '<span class="separator">·</span> ' + minutes + ' 分钟'
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