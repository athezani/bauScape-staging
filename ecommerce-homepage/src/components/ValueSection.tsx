import { Heart, Luggage, Shield, Sparkles } from 'lucide-react';

const values = [
  {
    icon: Heart,
    title: 'Con il Cuore',
    description: 'Esperienze progettate per voi due, dove ogni dettaglio conta.',
  },
  {
    icon: Shield,
    title: 'Sicuri e Protetti',
    description: "Location verificate e 100% dog-friendly, per godersi l'avventura senza pensieri.",
  },
  {
    icon: Sparkles,
    title: 'Momenti Unici',
    description: 'Attività e luoghi selezionati per vivere insieme emozioni che restano nel tempo.',
  },
  {
    icon: Luggage,
    title: 'Pronti a Partire',
    description: 'Tutto organizzato: devi solo partire e divertirti con il tuo cane.',
  },
];

export function ValueSection() {
  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="mb-4">
            Esperienze indimenticabili per te e il tuo cane
          </h2>
          <p style={{ color: 'var(--text-gray)' }} className="max-w-2xl mx-auto">
            Ogni viaggio, attività o avventura è pensata per creare ricordi unici insieme al tuo amico a quattro zampe. Con cura, attenzione e passione, trasformiamo ogni momento in un&apos;esperienza speciale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <div 
                key={index}
                className="text-center"
              >
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: 'var(--accent-soft)' }}
                >
                  <Icon 
                    className="w-8 h-8" 
                    style={{ color: 'var(--primary-purple)' }} 
                  />
                </div>
                <h3 className="mb-2">
                  {value.title}
                </h3>
                <p style={{ color: 'var(--text-gray)' }}>
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
