/*
  quick search without jQuery

  original under jQuery license:
    Rik Lomas quicksearch
    riklomas-quicksearch-7824f76
    https://github.com/riklomas/quicksearch
*/

function setupQuickSearch(input, paragraphs) {

  let timeoutId;
  const textCache = [];
  const delay = 100;

  // console.log(`setupQuickSearch(${input}, ${paragraphs.length} paragraphs)`)

  for (const node of paragraphs)
    textCache.push(node.textContent.toLowerCase().trim());

  filter();

  input.addEventListener('keyup', trigger);

  function trigger() {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(filter, delay);
  }

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

  function containsAll(text, words) {
    for (const word of words)
      if (text.indexOf(word) === -1)
        return false;
    return true;
  }

}
