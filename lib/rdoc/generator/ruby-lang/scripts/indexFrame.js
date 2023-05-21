
document.addEventListener('DOMContentLoaded', function () {

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
        this.entryCount = 0;
        this.entryHeight = 0;
        this.fixedHeight = 0;
      }
      this.prevHeight = null;
    }

    get currentHeight() {
      if (this.div)
        return this.div.getBoundingClientRect().height;
      else
        return 0;
    }

    get minHeight() {
      return this.fixedHeight + 2 * this.entryHeight;
    }

    setHeight(height, { resetPrev = false } = {}) {
      if (!this.div) return;
      // floor multiple of 0.01
      const h = (~~((height - this.fixedHeight) * 100)) / 100;
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

  }

  const fileIndex = new Index('file');
  const classIndex = new Index('class');
  const methodIndex = new Index('method');

  setupResizing();
  setupSearches();
  setupHighlighting();

  const fileClassResizer = document.getElementById('file-class-resizer');   // may be null
  const classMethodResizer = document.getElementById('class-method-resizer');

  frameResized(true);

  if (fileClassResizer)
    fileClassResizer.addEventListener('mousedown', function(e) {startDrag(e, fileIndex, classIndex)});
  classMethodResizer.addEventListener('mousedown', function(e) {startDrag(e, classIndex, methodIndex)});

  // handle highlighting in main frame when the document
  // in the main frame does not change
  function highlightTarget(e) {
    // this is relative:
    var target_href = e.target.getAttribute('href');
    // this is absolute:
    var current_href = top.mainFrame.location.href;
    var parts = target_href.split('#');
    var target_path = parts[0];
    var target_id = parts[1];
    var current_path = top.mainFrame.location.pathname;
    var i = current_path.length - target_path.length;
    var x = current_path.substring(i);
    if (i > 0 && current_path.substring(i) == target_path)
      highlightElement(target_id);
  }

  // highlight the passed id in the main frame
  function highlightElement(id) {
    const doc = top.mainFrame.document;
    for (const h of doc.querySelectorAll('.highlighted'))
      h.classList.remove('highlighted');
    const e = doc.getElementById(id);
    if (e)
      e.classList.add('highlighted');
  }

  function setupHighlighting () {
    for (const a of methodIndex.list.querySelectorAll('a[href*="#method-"]'))
      a.addEventListener('click', highlightTarget);
  }

  // setup search boxes
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

  let startY;             // where drag begins
  let startTopIndex;      // index object above when drag begins
  let startBottomIndex;   // index object below when drag begins
  let startTopHeight;     // height of the index above when drag begins
  let startBottomHeight;  // height of the index below when drag begins

  function startDrag(e, topIndex, bottomIndex) {
    startY = e.clientY;  // FIXME: probably int
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

  function placeResizers() {
    if (fileClassResizer)
      fileClassResizer.style.top = `${fileIndex.currentHeight}px`;
    if (classMethodResizer)
      classMethodResizer.style.top = `${fileIndex.currentHeight + classIndex.currentHeight}px`;
  }

  // setup callbacks resizing vertically & horizontally;
  function setupResizing() {
    // callback on resize event
    window.addEventListener('resize', function(e) { frameResized(false) });
  }

  // resize the left index blocks
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

    const frameWidth = top.indexFrame.visualViewport.width;

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
