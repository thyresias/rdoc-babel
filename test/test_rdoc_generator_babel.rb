require 'rdoc'
require 'minitest/autorun'
require 'tmpdir'
require 'nokogiri'

class TestRDocGeneratorBabel < Minitest::Test

  def setup

    @srcdir = File.expand_path(File.join(File.dirname(__FILE__), 'data'))

    @tmpdir = Dir.mktmpdir('rdoc_babel_')
    @delete = true
    @dirnum = 0

    @main = 'README.rdoc'
    @title = 'Babel Test'
    @charset = 'utf-8'

  end

  def teardown
    FileUtils.remove_entry_secure @tmpdir if @delete
  end

  def test_index

    make_doc %w(--title Hi --charset iso-8859-1 main_file.rb)
    doc = html_doc('index.html')
    # assert_equal 'iso-8859-1', doc.encoding

    # <meta http-equiv="refresh" content="0; url=classes/RDocBabel/Documented.html">
    url = doc.at_css('meta')['content'][/(?<=url=).+/]
    file = File.join(@docdir, url)
    doc = File.open(file, 'rb') { |f| Nokogiri.HTML f }
    assert_equal 'RDocBabel::Documented – Hi', doc.at_css('title').content

  end

  def test_first_page

    # - The file designated by the +main_page+ option,
    #   if there is a +TopLevel+ with that name.

    make_doc %w(--main main_file.rb README.rdoc main_file.rb)
    assert_main 'files/main_file_rb.html'

    make_doc %w(--main README.rdoc README.rdoc main_file.rb)
    assert_main 'files/README_rdoc.html'

    make_doc %w(--main does_not_exist.rdoc README.rdoc main_file.rb)
    assert_main 'files/README_rdoc.html'

    # - The first simple file that contains a comment
    #   (in the order given on the command line).

    make_doc %w(README.rdoc HISTORY.rdoc main_file.rb)
    # assert_main 'files/README_rdoc.html'
    # -> RDoc sorts files, so HISTORY.rdoc comes first
    assert_main 'files/HISTORY_rdoc.html'

    # - The first class or module that contains a comment.

    make_doc %w(main_file.rb)
    assert_main 'classes/RDocBabel/Documented.html'

    # - The first file that contains a comment
    #   (in the order given on the command line).

    # make_doc %w(not_commented.rb commented.rb)
    # assert_main 'files/commented_rb.html'

    # - The first class or module that has any kind of content.

    make_doc %w(not_commented.rb)
    assert_main 'classes/RDocBabelWithContent.html'

    # - The first class or module.

    make_doc %w(no_content.rb)
    assert_main 'classes/RDocBabel.html'

    # - The first file.

    make_doc %w(no_class_nor_module.rb)
    assert_main 'files/no_class_nor_module_rb.html'

  end

  def test_indexes

    make_doc %w(README.rdoc context_alias.rb)
    doc = html_doc('indexes.html')

    files = doc.at_css('#file-index')
    assert files, 'file index not found'

    refs = files.css('a')
    assert_equal 1, refs.length
    assert_equal 'README.rdoc', refs.first.content
    assert_equal 'files/README_rdoc.html', refs.first['href']

    classes = doc.at_css('#class-index')
    assert classes, 'class index not found'

    refs = classes.css('a')
    assert_equal 3, refs.length
    # long-standing RDoc bug
    # assert_equal "Mod2::Mod3 \u2192 Mod1", refs.last.content
    # assert_equal 'classes/Mod1.html', refs.last['href']

    methods = doc.at_css('#method-index')
    assert methods, 'method index not found'

    refs = methods.css('a')
    assert_equal 1, refs.length
    assert_equal 'met (Mod1)', refs.first.content
    assert_equal 'classes/Mod1.html#method-i-met', refs.first['href']

  end

  def test_description

    #@delete = false
    make_doc %w(ancestors.rb)

    doc = html_doc('classes/Klass.html')

    ali = doc.at_css('#method-i-ali')
    assert ali, 'Klass#ali not found'
    assert ali['class'].include?('method-alias'), 'Klass#ali CSS class missing'
    assert ali.content.include?('Alias for'), 'Klass#ali alias text missing'

    met = doc.at_css('#method-i-met')
    assert met, 'Klass#met not found'
    assert met.content.include?('See'), 'Klass#met "see" missing'
    assert met.content.include?('aliased'), 'Klass#met "aliased" missing'

    mut = doc.at_css('#method-i-mut')
    assert mut, 'Klass#mut not found'
    refute mut.content.include?('See'), 'Klass#mut "see" for Object'

    doc = html_doc('classes/Mod1.html')

    met = doc.at_css('#method-i-met')
    assert met, 'Mod1#met not found'
    refute met.content.include?('See'), 'Mod1#met "see" for Kernel'

  end

  def test_see_standard_ancestors

    make_doc %w(--see-standard-ancestors ancestors.rb)

    doc = html_doc('classes/Klass.html')

    mut = doc.at_css('#method-i-mut')
    assert mut, 'Klass#mut not found'
    assert mut.content.include?('See'), 'Klass#mut "see" for Object'

    doc = html_doc('classes/Mod1.html')

    met = doc.at_css('#method-i-met')
    assert met, 'Mod1#met not found'
    assert met.content.include?('See'), 'Mod1#met "see" for Kernel'

  end

  def test_decorated_call_seq

    check_call_seq 'try_convert', <<-CALL, <<-HTML.strip
      IO.try_convert(obj)  ->  io or nil
    CALL
      IO.<span class="c">try_convert</span>(obj)  &rarr;  io or nil
    HTML

    check_call_seq '<<', <<-CALL, <<-HTML.strip
      ios << obj     -> ios
    CALL
      ios <span class="c">&lt;&lt;</span> obj     &rarr; ios
    HTML

    check_call_seq 'pos', <<-CALL, <<-HTML.strip.gsub("\n", '')
      ios.pos     -> integer
      ios.tell    -> integer
    CALL
      ios.<span class="c">pos</span>     &rarr; integer<br/>
      ios.tell    &rarr; integer
    HTML

    check_call_seq 'readpartial', <<-CALL, <<-HTML.strip.gsub("\n", '')
      ios.readpartial(maxlen) -> string
      ios.readpartial(maxlen, outbuf) -> outbuf
    CALL
      ios.<span class="c">readpartial</span>(maxlen) &rarr; string<br/>
      ios.<span class="c">readpartial</span>(maxlen, outbuf) &rarr; outbuf
    HTML

    check_call_seq '[]', <<-CALL, <<-HTML.strip.gsub("\n", '')
      array[index]                - obj      or nil
      array[start, length]        - an_array or nil
      array[range]                - an_array or nil
      array.slice(index)          - obj      or nil
      array.slice(start, length)  - an_array or nil
      array.slice(range)          - an_array or nil
    CALL
      array<span class="c">[</span>index<span class="c">]</span>                - obj      or nil<br/>
      array<span class="c">[</span>start, length<span class="c">]</span>        - an_array or nil<br/>
      array<span class="c">[</span>range<span class="c">]</span>                - an_array or nil<br/>
      array.slice(index)          - obj      or nil<br/>
      array.slice(start, length)  - an_array or nil<br/>
      array.slice(range)          - an_array or nil
    HTML

  end

private

  def make_doc(args)
    Dir.chdir(@srcdir) do
      @dirnum += 1
      @docdir = File.join(@tmpdir, "doc_#@dirnum")
      args = [
        '--quiet',
        '--op', @docdir,
        '--format', 'babel',
      ] + args
      @rdoc = RDoc::RDoc.new
      @rdoc.document args
    end

  end

  def check_call_seq(name, call_seq, html)
    m = RDoc::AnyMethod.new(nil, name)
    m.call_seq = call_seq
    assert_equal html, babel_gen.decorated_call_seq(m, 'c')
  end

  def babel_gen
    @babel_gen ||= begin
      store = RDoc::Store.new
      options = Struct.new(:babel_options, :line_numbers, :template).new
      options.template = 'babel'
      options.babel_options = {}
      RDoc::Generator::Babel.new(store, options)
    end
  end

  def assert_main(expected_file)
    doc = html_doc('index.html')
    # <meta http-equiv="refresh" content="0; url=files/toc_core_md.html" />
    meta = doc.at_css('meta')
    content = meta['content']
    url = content[/(?<=url=).+/]
    assert_equal expected_file, url, "assert_main ##@dirnum"
  end

  def html_doc(file)
    file = File.join(@docdir, file)
    File.open(file, 'rb') { |f| Nokogiri.HTML f }
  end

end
