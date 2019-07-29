require 'hoe'

Hoe.spec 'rdoc-babel' do

  developer 'Thierry Lambert', 'thyresias@gmail.com'
  license 'MIT'

  self.summary = "An RDoc formatter producing HTML documentation."
  self.description = paragraphs_of('README.rdoc', 3, 6).join("\n\n")

  self.readme_file = 'README.rdoc'
  self.history_file = 'HISTORY.rdoc'
  self.extra_rdoc_files = ['README.rdoc', 'HISTORY.rdoc']

  self.remote_rdoc_dir = ''
  self.testlib = :minitest
  # self.test_prelude = %(gem "minitest")

  self.extra_deps << ['rdoc', '~> 6.1']

  self.extra_dev_deps << ['minitest', '~> 5.10']
  self.extra_dev_deps << ['nokogiri', '~> 1.7']

  spec_extras[:homepage] = 'http://github.com/thyresias/rdoc-babel'
  spec_extras[:rdoc_options] = %w(--main README.rdoc)

end

task :file_list do
  puts Dir['*'].reject { |f| File.directory? f }
  puts Dir['lib/**/*'].reject { |f| File.directory? f }
  puts Dir['test/**/*'].reject { |f| File.directory? f }
end
