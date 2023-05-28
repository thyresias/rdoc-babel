/*
  quick search without jQuery

  original under jQuery license:
    Rik Lomas quicksearch
    riklomas-quicksearch-7824f76
    https://github.com/riklomas/quicksearch
*/

// setup quick search:
// - input: the text search box
// - paragraphs: the paragraphs to show/hide
function setupQuickSearch(input, paragraphs) {

  let timeoutId;        // setTimeout id on key up
  const delay = 100;    // delay for search after key up
  const textCache = []; // cache of search texts (lowercase)

  // fill the cache
  for (const node of paragraphs)
    textCache.push(node.querySelector('a').textContent.toLowerCase().trim());

  // filter with the current content of the input box
  filter();

  input.addEventListener('keyup', trigger);

  // calls filter() after the delay
  function trigger() {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(filter, delay);
  }

  // perform filtering
  function filter() {

    if (!input.value) {
      for (node of paragraphs)
        node.style.display = '';
      return;
    }

    const words = input.value.toLowerCase().split(' ');
    for (let i = 0; i < paragraphs.length; i++)
      if (containsAll(textCache[i], words))
        paragraphs[i].style.display = '';
      else
        paragraphs[i].style.display = 'none';
  }

  // does text contain all words?
  function containsAll(text, words) {
    for (const word of words)
      if (text.indexOf(word) === -1)
        return false;
    return true;
  }

}
