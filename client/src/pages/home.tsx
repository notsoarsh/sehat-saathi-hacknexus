import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Heart, ShieldCheck, Stethoscope, MapPin, Pill, Bot, LogIn, UserPlus } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted">
      <Header />
      <main className="flex-1">
        <section className="pt-20 pb-24 px-4 relative">
          <div className="absolute top-4 right-4"><ThemeToggle /></div>
          <div className="max-w-5xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Heart className="w-12 h-12 text-primary" />
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-pink-500">
                SehatSaathi
              </h1>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Your companion for accessible healthcare: book doctor appointments, track prescriptions, locate nearby pharmacies & hospitals, and get quick health guidance in English & Hindi.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login"><Button size="lg" className="gap-2"><LogIn className="w-5 h-5"/> Login</Button></Link>
              <Link href="/register"><Button size="lg" variant="outline" className="gap-2"><UserPlus className="w-5 h-5"/> {t('register')}</Button></Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Login as patient or doctor. One unified platform.</p>
          </div>
        </section>

        <section className="py-16 bg-background/60 border-y">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
            {[
              { icon: Stethoscope, title: 'Smart Appointments', desc: 'Book and manage doctor appointments with status updates & clinic details.' },
              { icon: Pill, title: 'Prescription Hub', desc: 'View recent prescriptions and medicine availability in nearby pharmacies.' },
              { icon: MapPin, title: 'Live Location & Hospitals', desc: 'See nearest pharmacies and hospitals with real-time distance calculations.' },
              { icon: Bot, title: 'Bilingual Chatbot', desc: 'Get quick health guidance and ask in Hindi using on-screen keyboard.' },
              { icon: ShieldCheck, title: 'Secure Access', desc: 'Role-based JWT auth with local persistence keeps data safe.' },
              { icon: Heart, title: 'Patient-Centric', desc: 'Empowering rural & urban users with accessible health technology.' },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
                <f.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Why SehatSaathi?</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Bridging the gap between patients and healthcare providers with a lightweight, mobile-friendly platform supporting multilingual interaction and hyperlocal discovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login"><Button size="lg" className="gap-2"><LogIn className="w-5 h-5"/> Get Started</Button></Link>
              <Link href="/register"><Button size="lg" variant="outline">Create an Account</Button></Link>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/40">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-start">
            <div>
              <h3 className="text-2xl font-semibold mb-4">User Voices</h3>
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-card rounded-lg border shadow-sm">
                  <p className="italic">“Booking and prescription overview in one place helped me avoid missing doses.”</p>
                  <p className="mt-2 text-xs text-muted-foreground">— Patient (Rural)</p>
                </div>
                <div className="p-4 bg-card rounded-lg border shadow-sm">
                  <p className="italic">“Streamlined confirmations with clinic details reduced no‑shows.”</p>
                  <p className="mt-2 text-xs text-muted-foreground">— Dr. Sharma</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">FAQ</h3>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what-is">
                  <AccordionTrigger>What is SehatSaathi?</AccordionTrigger>
                  <AccordionContent>A web platform to connect patients and doctors, manage appointments, view prescriptions, and find nearby pharmacies & hospitals.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="roles">
                  <AccordionTrigger>Patient vs Doctor accounts?</AccordionTrigger>
                  <AccordionContent>Patients can book & view appointments, prescriptions, and location services. Doctors manage approvals, add clinic details, and issue prescriptions.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="language">
                  <AccordionTrigger>Does it support Hindi?</AccordionTrigger>
                  <AccordionContent>Yes, UI translations plus an on‑screen Hindi keyboard & bilingual chatbot.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h3 className="text-2xl font-semibold mb-4">Platform Glimpse</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              {['Appointment Flow','Live Map','Chatbot'].map(tag => (
                <div key={tag} className="p-4 border rounded-lg bg-card animate-pulse h-32 flex items-center justify-center text-muted-foreground">{tag} Preview</div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">(Add real screenshots later)</p>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SehatSaathi. For educational & hackathon use only.
      </footer>
    </div>
  );
}
