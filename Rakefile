require 'rubygems'
require 'hoe'

Hoe.spec 'rdoc-babel' do

  developer('Thierry Lambert', 'thyresias@gmail.com')

  self.summary = "An RDoc formatter producing HTML documentation."
  self.description = paragraphs_of('README.rdoc', 3, 6).join("\n\n")

  self.readme_file = 'README.rdoc'
  self.history_file = 'HISTORY.rdoc'
  self.extra_rdoc_files = ['README.rdoc', 'HISTORY.rdoc']

  self.remote_rdoc_dir = ''
  self.testlib = :minitest

  self.extra_deps << ['rdoc', '~> 3.0']

  self.extra_dev_deps << ['minitest', '>= 1.7']
  self.extra_dev_deps << ['nokogiri', '~> 1.4']

  spec_extras[:homepage] = 'http://github.com/thyresias/babel'
  spec_extras[:rdoc_options] = [
    '--main', 'README.rdoc',
  ]

  #spec_extras[:post_install_message] = <<-EOS
  #  the crash for creating Babel documentation is due to a RubyGem bug
  #EOS

end

task :file_list do
  puts Dir['*'].reject { |f| File.directory? f }
  puts Dir['lib/**/*'].reject { |f| File.directory? f }
  puts Dir['test/**/*'].reject { |f| File.directory? f }
end