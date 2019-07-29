# require 'rdoc'
# require 'rdoc/rdoc'
#require 'rdoc/generator'
require 'pathname'
require 'fileutils'
require 'erb'

# require 'rdoc/generator/markup'

# remove junk <span> at the end
class RDoc::Markup::ToHtml

  undef accept_heading

  def accept_heading heading
    level = [6, heading.level].min

    label = heading.label @code_object

    @res << if @options.output_decoration
              "\n<h#{level} id=\"#{label}\">"
            else
              "\n<h#{level}>"
            end
    @res << to_html(heading.text)
    @res << "</h#{level}>\n"
  end

end

##
# Babel RDoc HTML Generator.
# (Initially a variation of Darkfish.)

class RDoc::Generator::Babel

  RDoc::RDoc.add_generator(self)

  include ERB::Util

  # Directory containing babel templates.
  # Each template is in a subdirectory named after the template.

  TEMPLATE_ROOT = Pathname.new(__FILE__).expand_path.dirname

  ##
  # Babel-specific options.

  module Options

    ##
    # A hash <tt>option => value</tt>.

    attr_accessor :babel_options

  end

  class << self

    # Standard generator factory method.

    alias for new

    # Add Babel options to RDoc standard options.

    def setup_options(rdoc_options)

      options = {
        :stylesheet_url => nil,
        #:index_attributes => false,
        #:ancestor_lists => false,
        #:list_standard_ancestors => false,
        :see_standard_ancestors => false,
      }

      rdoc_options.extend Options  # extend the existing object
      rdoc_options.class.include Options  # make sure #babel_options will be there on #dup'ed objects
      rdoc_options.babel_options = options

      opt = rdoc_options.option_parser

      opt.separator "Babel options:"
      opt.separator nil

      opt.on('--style=URL', '-s',
          'Specifies the URL of a stylesheet',
          'that the template should use.',
          'The default is "rdoc.css".') do |value|
        options[:stylesheet_url] = value
      end
      opt.separator nil

=begin
      opt.on('--index-attributes',
          'Include attributes in the method index.',
          'By default, only methods are included.') do |value|
        options[:index_attributes] = true
      end
      opt.separator nil

      opt.on('--ancestor-lists',
          'Add lists of ancestor methods, attributes,',
          'aliases and constants in the documentation',
          'of a class/module.') do |value|
        options[:ancestor_lists] = true
      end
      opt.separator nil

      opt.on('--list-standard-ancestors',
          'Include Kernel/Object methods',
          'in ancestor methods.') do |value|
        options[:list_standard_ancestors] = true
      end
      opt.separator nil
=end

      opt.on('--see-standard-ancestors',
          'Add links to Kernel/Object',
          'ancestor methods.') do |value|
        options[:see_standard_ancestors] = true
      end
      opt.separator nil

    end

  end

  # Saves the options, makes sure the template is found.

  def initialize(store, options)
    @store = store
    @options = options
    @babel_options = options.babel_options
    @see_standard_ancestors = @babel_options[:see_standard_ancestors]
    RDoc::AnyMethod.add_line_numbers = options.line_numbers if RDoc::AnyMethod.respond_to? :add_line_numbers
    @options.template = 'ruby-lang' if @options.template == 'babel' # TODO leave template nil
    @template_dir = TEMPLATE_ROOT + @options.template
    @template_dir.directory? or raise RDoc::Error, "template not found: '#@template_dir'"
    @source_dir = Pathname.pwd.expand_path
  end

  # Directory for generated class/module files.
  # Used by RDoc::ClassModule to build paths.

  def class_dir
    'classes'
  end

  # Directory for generated TopLevel files.
  # Used by RDoc::TopLevel to build paths.

  def file_dir
    'files'
  end

  # Generates the documentation.

  def generate

    # set instance variables

    @output_dir = Pathname.new(@options.op_dir).expand_path(@source_dir)
    @all_classes_and_modules = @store.all_classes_and_modules.sort
    @unique_classes_and_modules = @store.unique_classes_and_modules.sort

    @all_methods = @unique_classes_and_modules.
      inject([]) { |a,m| a.concat m.method_list }.
      sort { |a,b| [a, a.parent_name] <=> [b, b.parent_name] }

    @all_files = @store.all_files # not sorted: keep command line order
    @files_with_comment = @all_files.reject { |f| f.comment.empty? }
    @simple_files = @files_with_comment.select { |f| f.parser == RDoc::Parser::Simple }

    @files_to_display =
      if @unique_classes_and_modules.empty?
        @all_files
      else
        @simple_files
      end

    @main_file = @options.main_page && @all_files.find { |f| f.full_name == @options.main_page }
    if @main_file
      unless @files_to_display.find { |f| f.full_name == @options.main_page }
        @files_to_display.unshift @main_file
      end
    end

    # write the output

    write_static_files
    generate_indexes
    generate_class_and_module_files
    generate_file_files

  rescue StandardError => err
    debug_msg "%s: %s\n  %s" % [ err.class.name, err.message, err.backtrace.join("\n  ") ]
    raise
  end

  # Copy static files to the output directory.
  # Static files are all files in the template directory
  # that do not have the <tt>.erb</tt> extension.

  def write_static_files
    debug_msg "Copying static files"
    options = { :verbose => $DEBUG_RDOC, :noop => @options.dry_run }
    static_files = Pathname.
      glob(@template_dir.to_s + '/**/*').
      reject { |f| f.extname == '.erb' }
    static_files.sort.each do |source_path|
      out_path = @output_dir + source_path.relative_path_from(@template_dir)
      if source_path.directory?
        out_path.mkpath unless @options.dry_run
      else
        FileUtils.cp source_path.to_s, out_path.dirname.to_s, options
      end
    end
  end

  # Generates +index.html+ and +indexes.html+.

  def generate_indexes
    @first_page = first_page
    generate_index('index')
    generate_index('indexes')
  end

  # Generates an index page.

  def generate_index(basename)
    debug_msg "Generating index #{basename}.html"
    template_file = @template_dir + "#{basename}.html.erb"
    outfile = @output_dir + "#{basename}.html"
    render_template(template_file, binding(), outfile)
  end

  # Generates a documentation page for each class.

  def generate_class_and_module_files
    template_file = @template_dir + 'class-page.html.erb'
    debug_msg "Generating class documentation"
    @unique_classes_and_modules.each do |klass|
      debug_msg "  %s %s" % [klass.type, klass.full_name]
      outfile = @output_dir + klass.path
      @class = klass
      self.render_template(template_file, binding(), outfile)
    end
  end

  # Generates a documentation page for each file.

  def generate_file_files
    template_file = @template_dir + 'file-page.html.erb'
    debug_msg "Generating file documentation"
    @all_files.each do |file|
      debug_msg "  file #{file.path}"
      outfile = @output_dir + file.path
      @file = file
      self.render_template(template_file, binding(), outfile)
    end
  end

  # Returns the first +Context+ object to display in the main frame.
  # This is, in order:
  # - The file designated by the +main_page+ option,
  #   if there is a +TopLevel+ with that name.
  # - The first simple file that contains a comment
  #   (in the order given on the command line).
  # - The first class or module that contains a comment.
  # - The first file that contains a comment
  #   (in the order given on the command line).
  # - The first class or module that has any kind of content.
  # - The first class or module.
  # - The first file.

  def first_page
    # TODO are there cases where main_page = 'README' for 'lib/README'?
    if @options.main_page && (main_file = @all_files.find { |f| f.full_name == @options.main_page })
      main_file
    elsif (file = @simple_files.first)
      file
    elsif (cm = @unique_classes_and_modules.find { |k| !k.comment.empty? })
      cm
    elsif (file = @files_with_comment.first)
      file
    elsif !@unique_classes_and_modules.empty?
      @unique_classes_and_modules.find { |k| k.any_content } or
        @unique_classes_and_modules.first
    else
      @all_files.first
    end
  end

  # Returns the HTML for the description of a method,
  # with alias information and link to ancestor method/attribute.

  def description(method)
    desc = method.documented? ? method.description.strip : ''
    if method.is_alias_for
      text = method.is_alias_for.documented? ? '<p>' : '<p class="nodoc">'
      text << 'Alias for ' << link(method, method.is_alias_for) << '</p>'
      append_with_nl desc, text
    end
    if method.see &&
        (@see_standard_ancestors ||
         method.see.parent.full_name !~ /^(Object|Kernel)$/)
      text = method.see.documented? ? '<p>' : '<p class="nodoc">'
      text << (desc.empty? ? 'See ' : 'See also ')
      text << link(method, method.see) << '</p>'
      append_with_nl desc, text
    end
    desc = '<p class="nodoc">(not documented)</p>' if desc.empty?
    unless method.aliases.empty?
      text = '<p>Also aliased as '
      text << method.aliases.map { |a| link(method, a) }.join(', ') << '</p>'
      append_with_nl desc, text
    end
    desc
  end

  # Decorates a call-seq to highlight the method name.
  # The output will have the method name inside HTML
  # +span+ tags with CSS class +method_name_class+.

  def decorated_call_seq(method, method_name_class)

    # I assume it is safe to use \001 \002 \003 \004 to escape & < > "
    text = method.call_seq.strip.gsub(/->/, "\001rarr;")
    ospan = "\002span class=\004#{method_name_class}\004\003"
    cspan = "\002/span\003"

    if method.name =~ /^[a-z]/i
      # look for things like 'IO.open' or 'open' at the beginning of lines
      name = Regexp.escape(method.name.sub(/=$/, ''))
      re = Regexp.new('^(\s*)([:\w]+\.)?(' << name << ')', Regexp::MULTILINE)
      text.gsub!(re, "\\1\\2#{ospan}\\3#{cspan}")
    elsif method.name =~ /\[\]=?/
      # [] and []=
      text.gsub!(/\[/m, "#{ospan}[#{cspan}")
      text.gsub!(/\]/m, "#{ospan}]#{cspan}")
    else
      # operators:
      # **
      # -(unary) +(unary) ~
      # *  /  %
      # +  -
      # <<  >>
      # &
      # |  ^
      # >  >=  <  <=
      # <=> == === =~
      name = Regexp.escape(method.name)
      re = Regexp.new(name, Regexp::MULTILINE)
      text.gsub!(re, "#{ospan}\\&#{cspan}")
    end

    h(text).gsub("\001", '&').gsub("\002",'<').gsub("\003",'>').gsub("\004",'"').gsub("\n", '<br/>')
  end

protected

  # Renders the erb template in +template_file+ within the
  # specified +binding+ context and writes the result to +outfile+.

  def render_template(template_file, binding, outfile)

    debug_msg "  rendering #{outfile}"

    @rel_prefix = @output_dir.relative_path_from(outfile.dirname)
    @stylesheet_url = @babel_options[:stylesheet_url] || (@rel_prefix + 'rdoc.css').to_s

    template_src = template_file.read
    template = ERB.new(template_src, nil, '<>')
    template.filename = template_file.to_s

    output = nil
    begin
      output = template.result(binding)
    rescue => e
      raise RDoc::Error, "Error while evaluating %s: %s (%s at %p)" % [
          template_file.to_s,
          e.message, e.class.name,
          eval("_erbout[-50,50]", binding)
        ], e.backtrace
    end

    return if @options.dry_run

    outfile.dirname.mkpath
    outfile.open('w', 0644) do |ofh|
      ofh.print(output)
    end

  end

  # Returns the <a> tag code linking to method +to+ from the page
  # describing method +from+.

  def link(from, to)
    to.parent = from.parent unless to.parent # HACK: to.parent may be nil
    href = from.parent.aref_to(to.path)
    to_parent = to.parent.full_name.dup
    if @options.show_hash
      text = from.parent.full_name == to_parent ? '' : to_parent
      text << (to.singleton ? '::' : '#') << to.name
    elsif from.parent.full_name == to_parent
      text = to.name.dup
    else
      text = to_parent
      text << (to.singleton ? '::' : '#') << to.name
    end
    %Q(<a href="#{href}">#{h(text)}</a>)
  end

  # Output progress information if debugging is enabled.

  def debug_msg(msg)
    $stderr.puts(msg) if $DEBUG_RDOC
  end

  # Appends string +add+ to +base+ with a newline between the two if needed,
  # and a final trailing newline.

  def append_with_nl(base, add)
    base.strip!
    base.sub!(/\S\z/, "\\&\n")
    base << add
    base << "\n"
  end

end
