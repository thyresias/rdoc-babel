/*
  Script for the left iframe.
*/

// CSS must be loaded before finding the geography of indexes
// document.addEventListener('DOMContentLoaded', function () {
window.addEventListener('load', function () {

  // --- class for index info

  // the info about an index block
  // index blocks are like this:

  // div#file-index
  //   div.title
  //     span.text
  //       Files
  //   div.entries
  //     <p><a href="files/standard_library_rdoc.html">doc/standard_library.rdoc</a></p>
  //     ...

  // div#class-index
  //   div.title
  //     span.text
  //       Classes
  //     input.search-field
  //   div.entries
  //     p.class
  //       span.type
  //         C
  //       <a href="classes/ACL.html">ACL</a>
  //     ...

  class Index {

    constructor(name) {
      this.name = name;
      this.div = document.getElementById(`${name}-index`);
      if (this.div) {
        // the height fitting the whole content
        this.fullHeight = this.div.getBoundingClientRect().height;
        this.title = this.div.querySelector('div.title');
        this.text = this.title.querySelector('span.text');
        // null for files:
        this.searchBox = this.title.querySelector('input');
        if (this.searchBox)
          this.fullBoxWidth = this.searchBox.getBoundingClientRect().width;
        else
          this.fullBoxWidth = 0;
        this.list = this.div.querySelector('div.entries');
        const style = window.getComputedStyle(this.list);
        const listHeightPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        this.entries = this.list.getElementsByTagName('p');
        this.links = this.list.getElementsByTagName('a');
        this.entryCount = this.entries.length;
        // height of one entry
        const listRect = this.list.getBoundingClientRect();
        this.entryHeight = (listRect.height - listHeightPadding) / this.entries.length;
        // amount of vertical space in an index other than the entries themselves
        // (title, paddings, etc.)
        this.fixedHeight = this.fullHeight - listRect.height + listHeightPadding;
      }
      else {
        this.fullHeight = 0;
        this.title = null;
        this.searchBox = null;
        this.list = null;
        this.entries = [];
        this.links = [];
        this.entryCount = 0;
        this.entryHeight = 0;
        this.fixedHeight = 0;
      }
      // height of this index before the current resize
      this.prevHeight = null;
    }

    get currentHeight() {
      if (this.div)
        return this.div.getBoundingClientRect().height;
      else
        return 0;
    }

    // enough room for 2 entries
    get minHeight() {
      return this.fixedHeight + 2 * this.entryHeight;
    }

    setHeight(height, { resetPrev = false } = {}) {
      if (!this.div) return;
      const h = height - this.fixedHeight;
      if (this.prevHeight === null || resetPrev) {
        // no previous or reset asked: set prev = current
        this.list.style.height = `${h}px`;
        this.prevHeight = this.currentHeight;
      }
      else {
        // save previous value before setting the current height
        this.prevHeight = this.currentHeight;
        this.list.style.height = `${h}px`;
      }
    }

    // save the layout of this index, including the search text
    saveInfo(storage) {
      if (!this.div) return;
      storage.setItem(`${this.name}Index.prevHeight`, this.prevHeight);
      storage.setItem(`${this.name}Index.styleHeight`, this.list.style.height);
      storage.setItem(`${this.name}Index.scrollTop`, this.list.scrollTop);
      if (this.searchBox) {
        storage.setItem(`${this.name}Index.searchWidth`, this.searchBox.style.width);
        storage.setItem(`${this.name}Index.searchText`, this.searchBox.value || '');
      }
    }

    // restore a previously saved layout & search text
    restoreInfo(storage) {
      if (!this.div) return;
      this.prevHeight = storage.getItem(`${this.name}Index.prevHeight`);
      this.list.style.height = storage.getItem(`${this.name}Index.styleHeight`);
      this.list.scrollTop = storage.getItem(`${this.name}Index.scrollTop`);
      if (this.searchBox) {
        this.searchBox.style.width = storage.getItem(`${this.name}Index.searchWidth`);
        this.searchBox.value = storage.getItem(`${this.name}Index.searchText`);
      }
    }

    // highlight the entry for <a> aNode and make sure it is visible
    setCurrent(aNode) {
      for (const a of this.links)
        if (a === aNode) {
          a.classList.add('current-main');
          this.ensureVisible(a);
        }
        else
          a.classList.remove('current-main');
    }

    ensureVisible(a) {
      const aTopOffset = a.offsetTop - this.links[0].offsetTop;
      const aHeight = a.getBoundingClientRect().height;
      const offScreen =
        // not (completely) visible because above
        aTopOffset < this.list.scrollTop ||
        // not (completely) visible because below
        aTopOffset + aHeight > this.list.scrollTop + this.list.clientHeight
      ;
      // position in the middle of the list
      if (offScreen)
        this.list.scrollTop = aTopOffset - this.list.clientHeight / 2;
    }

  }

  // --- global setup

  const fileIndex = new Index('file');
  const classIndex = new Index('class');
  const methodIndex = new Index('method');

  setupResizing();

  // --- setup the vertical resizing of indexes by dragging

  const fileClassResizer = document.getElementById('file-class-resizer');   // may be null
  const classMethodResizer = document.getElementById('class-method-resizer');

  if (!restoreLayoutInfo())
    frameResized(true);
  setupSearches();

  if (fileClassResizer)
    fileClassResizer.addEventListener('mousedown', function(e) {startDrag(e, fileIndex, classIndex)});
  classMethodResizer.addEventListener('mousedown', function(e) {startDrag(e, classIndex, methodIndex)});

  // --- highlight of the current file/class/method

  highlightCurrentIndexEntries();

  function highlightCurrentIndexEntries() {

    // /C:/docs/ruby/32/core/files/toc_core_md.html
    // /C:/docs/ruby/32/core/classes/Process.html
    const currentPath = window.parent.location.pathname;
    const index = (currentPath.indexOf('/classes/') < 0) ? fileIndex : classIndex;

    for (const a of index.links) {
      const href = a.getAttribute('href');
      if (currentPath.endsWith(href)) {
        index.setCurrent(a);
        break;
      }
    }

    if (index === fileIndex)
      return;

    setCurrentMethod(currentPath);
  }

  function setCurrentMethod(currentPath) {
    const hash = window.parent.location.hash;
    if (!hash) return;

    const currentMethod = `${currentPath}${hash}`;
    for (const a of methodIndex.links) {
      const href = a.getAttribute('href');
      if (currentMethod.endsWith(href)) {
        methodIndex.setCurrent(a);
        break;
      }
    }
  }

  // --- when clicking on a link, remember the scroll positions & search state of each index

  for (const a of fileIndex.links)
    a.addEventListener('click', saveLayoutInfo);
  for (const a of classIndex.links)
    a.addEventListener('click', saveLayoutInfo);
  for (const a of methodIndex.links)
    a.addEventListener('click', saveLayoutInfo);

  function saveLayoutInfo(e) {
    const s = window.parent.sessionStorage;
    s.setItem('infoSaved', 'true');

    // the width of the left frame
    const width = window.parent.document.getElementById('left-container').style.width;
    s.setItem('left.frameWidth', width);

    // position of the left frame resizer
    const left = window.parent.document.getElementById('resizer').style.left;
    s.setItem('left.resizerLeft', left);

    // the height & position of each index
    fileIndex.saveInfo(s);
    classIndex.saveInfo(s);
    methodIndex.saveInfo(s);
  }

  // restores the saved layout and returns true, or returns false if no saved layout
  function restoreLayoutInfo() {
    // restore previous scroll positions & search states if any
    const s = window.parent.sessionStorage;
    const saved = s.getItem(`infoSaved`);
    if (saved) {
      window.parent.document.getElementById('left-container').style.width = s.getItem('left.frameWidth');
      window.parent.document.getElementById('resizer').style.left = s.getItem('left.resizerLeft');
      fileIndex.restoreInfo(s);
      classIndex.restoreInfo(s);
      methodIndex.restoreInfo(s);
      placeResizers();
    }
    return saved === 'true';
  }

  // --- when navigating inside the same main document, handle current method highlighting

  window.parent.addEventListener('hashchange', mainHashChanged);

  // highlight the new method in the main frame, and in the method index
  function mainHashChanged(e) {
    const id = e.newURL.split('#')[1];
    highlightElement(id);
    setCurrentMethod(window.parent.location.pathname);
  }

  // highlight the passed id in the main frame
  function highlightElement(id) {
    const doc = window.parent.document;
    for (const h of doc.querySelectorAll('.highlighted'))
      h.classList.remove('highlighted');
    if (id === 'header')
      return;
    const e = doc.getElementById(id);
    if (e)
      e.classList.add('highlighted');
  }

  // --- search boxes

  function setupSearches() {
    const helpText = 'filter...';
    setupSearch(classIndex.searchBox, classIndex.entries, helpText);
    setupSearch(methodIndex.searchBox, methodIndex.entries, helpText);
  }

  function setupSearch(searchBox, entries, helpText) {
    // hook quicksearch
    setupQuickSearch(searchBox, entries);
    // set helper text
    searchBox.setAttribute('placeholder', helpText);
  }

  // --- vertical manual resizing of the indexes
  // div#file-index
  // div#file-class-resizer  (absent if the above div is not there)
  // div#class-index
  // div#class-method-resizer
  // div#method-index

  let startY;             // where drag begins
  let startTopIndex;      // index object above when drag begins
  let startBottomIndex;   // index object below when drag begins
  let startTopHeight;     // height of the index above when drag begins
  let startBottomHeight;  // height of the index below when drag begins

  function startDrag(e, topIndex, bottomIndex) {
    startY = e.clientY;
    startTopIndex = topIndex;
    startBottomIndex = bottomIndex;
    startTopHeight = topIndex.currentHeight;
    startBottomHeight = bottomIndex.currentHeight;
    document.documentElement.addEventListener('mousemove', doDrag);
    document.documentElement.addEventListener('mouseup', stopDrag);
  }

  function stopDrag(e) {
    document.documentElement.removeEventListener('mousemove', doDrag);
    document.documentElement.removeEventListener('mouseup', stopDrag);
  }

  function doDrag(e) {
    const dY = e.clientY - startY;
    const newTopHeight = startTopHeight + dY;
    const newBottomHeight = startBottomHeight - dY;
    if (newTopHeight < startTopIndex.minHeight || newBottomHeight < startBottomIndex.minHeight)
      return;
    startTopIndex.setHeight(newTopHeight, { resetPrev: true });
    startBottomIndex.setHeight(newBottomHeight, { resetPrev: true });
    placeResizers();
  }

  // place the vertical resizers between their indexes
  function placeResizers() {
    if (fileClassResizer)
      fileClassResizer.style.top = `${fileIndex.currentHeight}px`;
    if (classMethodResizer)
      classMethodResizer.style.top = `${fileIndex.currentHeight + classIndex.currentHeight}px`;
  }

  // --- resizing of the window by the user or by the left/main resizer in the main frame

  function setupResizing() {
    window.addEventListener('resize', function(e) { frameResized(false) });
  }

  // resize the left index blocks
  // if initial is true, this is the first resize, called above when loading
  function frameResized(initial) {

    resizeSearchField(classIndex);
    resizeSearchField(methodIndex);

    const heights = initial ? initialHeights() : updatedHeights();
    fileIndex.setHeight(heights.files);
    classIndex.setHeight(heights.classes);
    methodIndex.setHeight(heights.methods);

    placeResizers();
  }

  // resize a search field to avoid overlapping text (if possible)
  function resizeSearchField(indexBlock) {
    const container = indexBlock.title;
    const box = indexBlock.searchBox;
    const text = indexBlock.text;

    const frameWidth = window.visualViewport.width;

    const textRect = text.getBoundingClientRect();
    const textWidth = textRect.width;
    const textRight = textRect.left + textWidth;

    const boxRect = box.getBoundingClientRect();
    const boxLeft = boxRect.left;
    const boxWidth = boxRect.width;

    const boxRight = boxLeft + boxWidth;
    const offset = frameWidth - boxRight;

    // try to ensure offset between the text & the box
    // if the box becomes too narrow, stop resizing it

    const boxSpace = frameWidth - 2 * offset - textRight;

    if (boxSpace >= indexBlock.fullBoxWidth)
      box.style.width = `${indexBlock.fullBoxWidth}px`;   // plenty of room
    else if (boxSpace > textWidth)
      box.style.width = `${boxSpace}px`;       // shrink it
    else
      box.style.width = `${textWidth}px`;      // min width

  }

  // returns the initial heights of index blocks for the current window size
  // if the combined height of the 3 indexes is more than the window height:
  // - shrinks the file index to 5 entries if more
  // - shrinks the method index to 33%, but leaving at least 5 entries visible
  // - shrinks the class index to the available space, but leaving at least 5 entries visible
  // so if very little height, the result may not fit
  function initialHeights() {

    // returned information
    const heights = {
      files: fileIndex.fullHeight,
      classes: classIndex.fullHeight,
      methods: methodIndex.fullHeight
    };

    let frameHeight = window.visualViewport.height;
    const totalHeight = heights.files + heights.classes + heights.methods;

    // if everything fits, we're done
    if (totalHeight <= frameHeight)
      return heights;

    let excess = totalHeight - frameHeight;

    // first try to reduce the file index to 5 files if more
    if (fileIndex.entryCount > 5) {
      // the most we can gain:
      const gain = (fileIndex.entryCount - 5) * fileIndex.entryHeight;
      if (gain >= excess) {
        heights.files -= excess;
        return heights;
      }
      // we will shrink something else: minimize the height for files
      heights.files -= gain;
      excess -= gain;
    }

    // if the method list is more than 33% high,
    // try first to reduce it to 33%
    if (methodIndex.entryCount > 5) {
      const maxHeight = frameHeight / 3;
      if (methodIndex.fullHeight > maxHeight) {
        let gain = methodIndex.fullHeight - maxHeight;
        // leave at least 5 methods visible
        const maxGain = (methodIndex.entryCount - 5) * methodIndex.entryHeight;
        if (gain > maxGain)
          gain = maxGain;
        if (gain >= excess) {
          // just shrinking the methods will be fine
          heights.methods -= excess;
          return heights;
        }
        // we will also shrink the classes: gain what we can
        heights.methods -= gain;
        excess -= gain;
      }
    }

    // shrink the classes if possible, leaving at least 5 classes visible
    if (classIndex.entryCount > 5) {
      let gain = excess;
      const maxGain = (classIndex.entryCount - 5) * classIndex.entryHeight;
      if (gain > maxGain)
        gain = maxGain;
      heights.classes -= gain;
      excess -= gain;
    }

    return heights;
  }

  // returns the updated heights of index blocks for the current window size
  // resizes each index proportionally
  function updatedHeights() {

    let frameHeight = window.visualViewport.height;
    const totalHeight = fileIndex.fullHeight + classIndex.fullHeight + methodIndex.fullHeight;

    // if everything fits, we're done
    if (totalHeight <= frameHeight)
      return {
        files: fileIndex.fullHeight,
        classes: classIndex.fullHeight,
        methods: methodIndex.fullHeight
      };

    // try to maintain proportionality
    const heights = {
      files: fileIndex.currentHeight,
      classes: classIndex.currentHeight,
      methods: methodIndex.currentHeight
    };

    // already sized as appropriate: nothing to do
    if (frameHeight === fileIndex.currentHeight + classIndex.currentHeight + methodIndex.currentHeight)
      return heights;

    // proportional resize
    const prevHeight = fileIndex.prevHeight + classIndex.prevHeight + methodIndex.prevHeight;
    const factor = frameHeight / prevHeight;

    if (fileIndex.prevHeight * factor >= fileIndex.minHeight)
      heights.files = fileIndex.prevHeight * factor;

    if (classIndex.prevHeight * factor >= classIndex.minHeight)
      heights.classes = classIndex.prevHeight * factor;

    if (frameHeight - heights.files - heights.classes >= methodIndex.minHeight)
      heights.methods = frameHeight - heights.files - heights.classes;

    return heights;
  }

});
