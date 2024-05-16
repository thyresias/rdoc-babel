/*
  Script for the main frame.
  Originally an adaptation of (darkfish.js by Michael Granger)
*/

document.addEventListener('DOMContentLoaded', function () {

  const leftContainer = document.getElementById('left-container');
  const leftFrame = document.getElementById('left-frame');
  const resizer = document.getElementById('resizer');

  setupTOC();
  setupShowSource();
  setupShowConstantValue();
  setupShowAllFiles();
  setupInnerLinksHighlight();
  highlightUrlHash();

  // --- resizing of the left frame

  resizer.addEventListener('mousedown', startWidthResize);

  let startX;       // where drag begins
  let startWidth;   // width of left frame when drag begins
  function startWidthResize(e) {
    startX = e.clientX;
    startWidth = leftContainer.getBoundingClientRect().width;
    document.documentElement.addEventListener('mousemove', doWidthResize);
    document.documentElement.addEventListener('mouseup', stopWidthResize);
    leftFrame.contentDocument.addEventListener('mousemove', doWidthResize);
    leftFrame.contentDocument.addEventListener('mouseup', stopWidthResize);
  }

  function stopWidthResize(e) {
    document.documentElement.removeEventListener('mousemove', doWidthResize);
    document.documentElement.removeEventListener('mouseup', stopWidthResize);
    leftFrame.contentDocument.removeEventListener('mousemove', doWidthResize);
    leftFrame.contentDocument.removeEventListener('mouseup', stopWidthResize);
  }

  function doWidthResize(e) {
    const dX = e.clientX - startX;
    const newWidth = startWidth + dX;
    if (newWidth > 100)
      leftContainer.style.width = `${newWidth}px`;
  }

  // --- TOC button setup

  function setupTOC() {

    const nav = document.createElement('nav');
    nav.innerHTML = `
      <button id="menu-button">
        <img class="icon-hamburger">
        <img class="icon-cross">
      </button>
      <div id="menu-content" class="hidden">
        <p id="menu-top">
          <a href="#header">(top)</a>
        </p>
        <div id="toc-content">
        </div>
      </div>
    `;
    const main = document.getElementById('main-container');
    const doc = document.getElementById('documentation');
    main.insertBefore(nav, doc);

    const menu_button = document.getElementById('menu-button');
    const menu_content = document.getElementById('menu-content');
    const toc_content = document.getElementById('toc-content');

    function createTOC() {
      const headings = document.body.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length == 0)
        return false;
      let generated_id_index = 0;
      const first_summary_heading = firstSummaryHeading();
      // console.log(`${headings.length} headings`);
      for (const h of headings) {
        // console.log(`name = ${h.tagName} id=${h.id} text = ${h.innerText}`);
        if (!h.id) {
          generated_id_index++;
          h.setAttribute('id', `toc-auto-id-${generated_id_index}`);
        }
        if (h === first_summary_heading) {
          const sp = document.createElement('p');
          toc_content.appendChild(sp);
          sp.setAttribute('class', 'h2');
          sp.textContent = 'Summary';
        }
        // <p class="toc2"><a href="#label-News">News</a></p>
        const p = document.createElement('p');
        toc_content.appendChild(p);
        p.setAttribute('class', h.tagName.toLowerCase());
        const a = document.createElement('a');
        p.appendChild(a);
        a.setAttribute('href', `#${h.id}`);
        a.textContent = h.innerText; // h.textContent;
      }

      return true;
    }

    function firstSummaryHeading() {
      const ids = [
        'class-aliases',
        'method-list',
        'namespace-list',
        'include-list',
        'constant-list',
        'external-aliases',
        'class-attributes',
        'instance-attributes',
      ];
      for (const id of ids) {
        const h = document.querySelector(`#${id} h3`);
        if (h) return h;
      }
      return null;
    }

    if (!createTOC())
      nav.classList.add('hidden');

    // show/hide the menu/toc
    menu_button.addEventListener('click', function(e) {
      e.preventDefault();
      toggleMenu();
    });

    // hide the menu on Escape
    document.addEventListener('keydown', function(e) {
      if (!isMenuVisible()) return;
      if (e.code == 'Escape' && !e.ctrlKey) {
        e.preventDefault();
        hideMenu();
      }
    });

    // hide the menu when clicking outside of nav
    document.addEventListener('click', function (event) {
      if (!isMenuVisible()) return;
      if (!nav.contains(event.target))
        hideMenu();
    });

    function hideMenu() {
      menu_content.classList.add('hidden');
      menu_button.classList.remove('show-close');
    }

    function showMenu() {
      menu_content.classList.remove('hidden');
      menu_button.classList.add('show-close');
    }

    function isMenuVisible() {
      return !menu_content.classList.contains('hidden');
    }

    function toggleMenu() {
      if (isMenuVisible())
        hideMenu();
      else
        showMenu();
    }

  }

  // --- toggle method source display

  function setupShowSource() {
    for (const node of document.querySelectorAll('.method-heading'))
      node.addEventListener('click', toggleSource);
    // <div id="method-c-_httpdate" class="method-detail">
    //   <div class="method-heading">
    //     ...
    //   </div>
    //   <div class="method-description">
    //     ...
    //   <pre class="method-source-code">
    //     (code)
    //   </pre>
  }

  function toggleSource(e) {
    //TODO not when clicking a link
    const source = e.currentTarget.parentNode.querySelector('.method-source-code');
    if (source)
      slideToggle(source);
  }

  // --- toggle constant value display

  function setupShowConstantValue() {
    for (const node of document.querySelectorAll('#constant-list .const-display'))
      node.addEventListener('click', toggleValue);
    // <tr id="MONTHNAMES" class="const-display">
    //   <td class="const-name"><p>MONTHNAMES</p></td>
    //   <td class="const-desc">
    //     <p>An array of strings of full month names in <a href="English.html"><code>English</code></a>.  The first element is nil.</p>
    //   </td>
    // <td><p class="click-advice">click to toggle value</p></td>
    // </tr>
    // <tr class="const-value">
    //   <td></td>
    //   <td><pre>mk_ary_of_str(13, monthnames)</pre></td>
    //   <td></td>
    // </tr>
  }

  function toggleValue(e) {
    //TODO not when clicking a link
    toggleDisplay(e.currentTarget.nextElementSibling, 'table-row');
  }

  function toggleDisplay(element, visibleDisplayValue) {
    if (element.style.display !== visibleDisplayValue)
      element.style.display = visibleDisplayValue;
    else
      element.style.display = 'none';
  }

  // --- toggle the display of all files where the class/module if defined

  function setupShowAllFiles() {
    const allFiles = document.getElementById('all-files');
    if (!allFiles) return;
    let skipBodyClick = false;
    document.getElementById('show-all-files').addEventListener('click', function(e) {
      e.preventDefault();
      skipBodyClick = true;
      toggleDisplay(allFiles, 'block');
    });
    document.body.addEventListener('click', function() {
      if (skipBodyClick)
        skipBodyClick = false;
      else if (allFiles.style.display !== 'none')
        allFiles.style.display = 'none';
    });
  }

  // --- highlight the target method when clicked from an inner method link

  function setupInnerLinksHighlight() {
    for (const a of document.querySelectorAll('a[href*="#"]'))
      a.addEventListener('click', highlightTarget);
  }

  function highlightTarget(e) {
    const href = e.currentTarget.getAttribute('href');
    const match = /#(.*)/.exec(href);
    if (match && match[1].length > 1)
      highlightElement(match[1]);
  }

  function highlightElement(id) {
    for (const h of document.querySelectorAll('.highlighted'))
      h.classList.remove('highlighted');
    if (id === 'header')
      return;
    const e = document.getElementById(id);
    if (e)
      e.classList.add('highlighted');
  }

  // --- highlight the method if present in the location hash

  function highlightUrlHash() {
    const h = window.location.hash;
    if (h && h.length > 1)
      highlightElement(h.substring(1));
  }

  // --- smooth toggling (for source code)
  // from plain JS slideToggle https://github.com/ericbutler555/plain-js-slidetoggle

  function slideToggle(element, duration) {
    if (typeof duration === 'undefined') duration = 400;
    if (element.clientHeight === 0)
      slide(element, duration, true);
    else
      slide(element, duration, false);
  }

  function slide(el, duration, isDown) {

    el.style.overflow = "hidden";
    if (isDown) el.style.display = "block";

    const elStyle        = window.getComputedStyle(el);

    const elHeight        = parseFloat(elStyle.getPropertyValue('height'));
    const elPaddingTop    = parseFloat(elStyle.getPropertyValue('padding-top'));
    const elPaddingBottom = parseFloat(elStyle.getPropertyValue('padding-bottom'));
    const elMarginTop     = parseFloat(elStyle.getPropertyValue('margin-top'));
    const elMarginBottom  = parseFloat(elStyle.getPropertyValue('margin-bottom'));

    const stepHeight        = elHeight        / duration;
    const stepPaddingTop    = elPaddingTop    / duration;
    const stepPaddingBottom = elPaddingBottom / duration;
    const stepMarginTop     = elMarginTop     / duration;
    const stepMarginBottom  = elMarginBottom  / duration;

    let start;

    function step(timestamp) {

      if (start === undefined) start = timestamp;

      const elapsed = timestamp - start;

      if (isDown) {
        el.style.height        = (stepHeight        * elapsed) + "px";
        el.style.paddingTop    = (stepPaddingTop    * elapsed) + "px";
        el.style.paddingBottom = (stepPaddingBottom * elapsed) + "px";
        el.style.marginTop     = (stepMarginTop     * elapsed) + "px";
        el.style.marginBottom  = (stepMarginBottom  * elapsed) + "px";
      } else {
        el.style.height        = elHeight        - (stepHeight        * elapsed) + "px";
        el.style.paddingTop    = elPaddingTop    - (stepPaddingTop    * elapsed) + "px";
        el.style.paddingBottom = elPaddingBottom - (stepPaddingBottom * elapsed) + "px";
        el.style.marginTop     = elMarginTop     - (stepMarginTop     * elapsed) + "px";
        el.style.marginBottom  = elMarginBottom  - (stepMarginBottom  * elapsed) + "px";
      }

      if (elapsed >= duration) {
        el.style.height        = "";
        el.style.paddingTop    = "";
        el.style.paddingBottom = "";
        el.style.marginTop     = "";
        el.style.marginBottom  = "";
        el.style.overflow      = "";
        if (!isDown) el.style.display = "none";
      } else {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

});
