
module Kernel
  def met; end
end

class Object
  def mut; end
end

module Mod1
  # doc
  def met; end
  def nod; end
  def mot; end
end

module Mod2
  include Mod1
  # doc
  def met; end
end

module Mod3
  include Mod2
  def met; end
  def nod; end
  def mot; end  # rdoc bug
end

module Mod4
  # doc
  def met; end
end

class Klass
  include Mod1
  include Mod4
  def met; end
  def mut; end
  alias ali met
  alias ald nod
end
