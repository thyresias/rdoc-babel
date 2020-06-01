require "rake/testtask"

Rake::TestTask.new do |t|
  t.test_files = FileList['test/test*.rb']
end

desc 'build & install gem'
task 'gem' do
  system 'gem build rdoc-babel.gemspec'
  system 'gem install rdoc-babel --local'
end

desc 'publish the gem'
task 'push' do
  gemfile = Dir['*.gem'].sort.last
  system "gem push #{gemfile}"
end
