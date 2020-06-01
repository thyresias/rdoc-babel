
h = Object.new  # helper object

def h.doc_files
  %w(README.rdoc HISTORY.rdoc)
end

def h.lib_files
  Dir['lib/**/*'].reject { |f| File.directory?(f) }
end

def h.test_files
  Dir['test/**/*'].reject { |f| File.directory?(f) }
end

def h.version
  line = File.read('lib/rdoc_babel.rb').lines.grep(/VERSION/).first
  line[/VERSION\s*=\s*(['"])(.+)\1/, 2]
end

def h.runtime_deps
  %w(
    rdoc ~> 6.2
  )
end

def h.dev_deps
  %w(
    minitest ~> 5.14
    nokogiri ~> 1.10
  )
end

Gem::Specification.new do |s|
  s.name = 'rdoc-babel'
  s.summary = "An RDoc formatter producing HTML documentation."
  s.description = <<~TEXT
    Babel is an RDoc formatter producing HTML documentation.
    The default template is +ruby-lang+:
    - Look and feel inspired from https://www.ruby-lang.org/.
    - Dual-frame output, with indexes on the left.
    - Search boxes for classes and methods.
    - Links to undocumented classes/methods are grayed.
    - Highlights target methods, attributes and constants.
    - Adds links to ancestor methods/attributes.
  TEXT
  s.license = 'MIT'

  s.version = h.version

  s.author = 'Thierry Lambert'
  s.email = 'thyresias@gmail.com'
  s.homepage = 'https://github.com/thyresias/rdoc-babel'

  s.files = ['Rakefile'] + h.doc_files + h.lib_files + h.test_files

  s.extra_rdoc_files = h.doc_files
  s.rdoc_options <<
    '--title' << 'RDoc Babel' <<
    '--main' << h.doc_files.first

  h.runtime_deps.each_slice(3) do |name, op, version|
    s.add_runtime_dependency name, ["#{op}#{version}"]
  end

  h.dev_deps.each_slice(3) do |name, op, version|
    s.add_development_dependency name, ["#{op}#{version}"]
  end

end
