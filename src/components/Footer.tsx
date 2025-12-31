export default function Footer() {
  return (
    <footer className="bg-dark text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <span className="text-2xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </div>
            <p className="text-gray-400 max-w-md">
              Vysion Horeca is een onderdeel van de Vysion Group International.
              <br /><br />
              <strong className="text-gray-300">Adres:</strong><br />
              Vysion Group International<br />
              Siberiëstraat 24<br />
              3900 Pelt, België
              <br /><br />
              <a href="https://www.vysionapps.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">www.vysionapps.io</a>
              <br />
              <a href="https://www.vysionhoreca.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">www.vysionhoreca.com</a>
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#functies" className="text-gray-400 hover:text-white transition-colors">Functies</a></li>
              <li><a href="#prijzen" className="text-gray-400 hover:text-white transition-colors">Prijzen</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Updates</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Bedrijf</h4>
            <ul className="space-y-2">
              <li><a href="#over-ons" className="text-gray-400 hover:text-white transition-colors">Over ons</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
              <li><a href="/juridisch" className="text-gray-400 hover:text-white transition-colors">Juridisch</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
          </p>
          <p className="text-gray-500 text-sm mt-4 sm:mt-0">
            Design by Vysion
          </p>
        </div>
      </div>
    </footer>
  )
}
