import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, ScanLine, Sprout, MessageCircle, Search, Languages } from 'lucide-react';
import './LandingPage.css';

const copy = {
  en: {
    nav: ['Features', 'How It Works', 'About'], eyebrow: 'AI-POWERED AGRICULTURE',
    hero: 'AI-Powered Seed Identification and Crop Recommendation',
    heroText: 'Identify seeds from images, explore crop recommendations based on soil, climate, season and category, and access plant disease guidance in one platform.',
    start: 'Get Started', explore: 'Explore Features', offers: 'What SAgriVision AI Offers',
    offersText: 'Explore tools for seed identification, crop selection and plant health guidance.',
    features: [
      ['Seed Identification', 'Upload a seed image to identify the seed type using the existing identification model.', '/seed-analysis', ScanLine],
      ['Crop Recommendation', 'Explore suitable crop suggestions based on soil type, climate, season and category.', '/crop-recommendation/info', Sprout],
      ['Disease Detection', 'Use the available disease detection features to explore plant health and treatment guidance.', '/disease-detection', Leaf],
      ['CropGPT Assistant', 'Explore the agricultural assistant for crop-related questions and guidance.', '/cropgpt', MessageCircle]
    ],
    how: 'How It Works', steps: [['Provide Information', 'Upload a seed image or enter your farm conditions.'], ['Get AI-Assisted Results', 'Explore seed identification, crop suggestions or available disease guidance.'], ['Review Results', 'Review the results and revisit saved records or reports where available.']],
    about: 'About SAgriVision AI', aboutText: 'SAgriVision AI is an AI-powered agriculture project designed to support smarter agricultural decisions. It brings together seed identification from images, crop recommendations based on soil type, climate, season and category, plant disease detection with treatment guidance, and CropGPT, an agricultural assistant. The platform aims to make these tools accessible through a single, user-friendly interface.', team: 'Meet the Team', teamMembers: [['Akshara Saxena', 'Crop Recommendation', 'AS'], ['Ankit Pal', 'Seed Identification', 'AP'], ['Ayushi Gupta', 'Disease Detection', 'AG'], ['Akshara Saxena & Ankit Pal', 'CropGPT Assistant', 'AA']],
    cta: 'Explore Smarter Agriculture Tools', ctaText: 'Get started with the available seed, crop and plant health tools.', footer: '© 2026 SAgriVision AI'
  },
  hi: {
    nav: ['विशेषताएँ', 'यह कैसे काम करता है', 'हमारे बारे में'], eyebrow: 'AI-संचालित कृषि',
    hero: 'AI-आधारित बीज पहचान और फसल अनुशंसा',
    heroText: 'तस्वीरों से बीजों की पहचान करें, मिट्टी, जलवायु, मौसम और श्रेणी के आधार पर फसल अनुशंसाएँ पाएँ, और एक ही प्लेटफ़ॉर्म पर पौधों के रोगों से जुड़ी जानकारी प्राप्त करें।',
    start: 'शुरू करें', explore: 'सुविधाएँ देखें', offers: 'SAgriVision AI की सुविधाएँ',
    offersText: 'बीज पहचान, फसल चयन और पौधों के स्वास्थ्य से जुड़ी सुविधाएँ जानें।',
    features: [
      ['बीज पहचान', 'मौजूदा पहचान मॉडल की मदद से बीज के प्रकार की पहचान करने के लिए उसकी तस्वीर अपलोड करें।', '/seed-analysis', ScanLine],
      ['फसल अनुशंसा', 'मिट्टी के प्रकार, जलवायु, मौसम और श्रेणी के आधार पर उपयुक्त फसल सुझाव पाएँ।', '/crop-recommendation/info', Sprout],
      ['रोग पहचान', 'पौधों के स्वास्थ्य और उपचार संबंधी जानकारी के लिए उपलब्ध रोग पहचान सुविधाओं का उपयोग करें।', '/disease-detection', Leaf],
      ['CropGPT सहायक', 'फसल से जुड़े सवालों और मार्गदर्शन के लिए कृषि सहायक का उपयोग करें।', '/cropgpt', MessageCircle]
    ],
    how: 'यह कैसे काम करता है', steps: [['जानकारी दें', 'बीज की तस्वीर अपलोड करें या अपने खेत की परिस्थितियाँ दर्ज करें।'], ['AI-आधारित परिणाम पाएँ', 'बीज पहचान, फसल सुझाव या उपलब्ध रोग संबंधी मार्गदर्शन देखें।'], ['परिणाम देखें', 'परिणाम देखें और जहाँ उपलब्ध हों, वहाँ पुराने रिकॉर्ड या रिपोर्ट दोबारा देखें।']],
    about: 'SAgriVision AI के बारे में', aboutText: 'SAgriVision AI एक AI-संचालित कृषि परियोजना है, जिसे बेहतर कृषि निर्णय लेने में सहायता के लिए बनाया गया है। इसमें तस्वीरों से बीज की पहचान, मिट्टी के प्रकार, जलवायु, मौसम और श्रेणी के आधार पर फसल अनुशंसा, पौधों के रोगों की पहचान और उपचार संबंधी मार्गदर्शन, तथा CropGPT नामक कृषि सहायक शामिल हैं। यह प्लेटफ़ॉर्म इन सुविधाओं को एक ही सरल और उपयोगकर्ता-अनुकूल इंटरफ़ेस में उपलब्ध कराने का प्रयास करता है।', team: 'हमारी टीम से मिलें', teamMembers: [['Akshara Saxena', 'फसल अनुशंसा', 'AS'], ['Ankit Pal', 'बीज पहचान', 'AP'], ['Ayushi Gupta', 'रोग पहचान', 'AG'], ['Akshara Saxena और Ankit Pal', 'CropGPT कृषि सहायक', 'AA']],
    cta: 'कृषि के स्मार्ट टूल्स का उपयोग करें', ctaText: 'उपलब्ध बीज, फसल और पौधों के स्वास्थ्य संबंधी टूल्स का उपयोग शुरू करें।', footer: '© 2026 SAgriVision AI'
  }
};

function Brand() { return <Link to="/" className="landing-brand"><span className="landing-brand-mark"><Leaf size={17}/></span><span>SAgriVision <b>AI</b></span></Link>; }
function LanguageToggle({ lang, change }) { return <div className="landing-language" aria-label="Language selector"><Languages size={15}/><button className={lang === 'en' ? 'active' : ''} onClick={() => change('en')}>EN</button><button className={lang === 'hi' ? 'active' : ''} onClick={() => change('hi')}>हिंदी</button></div>; }

export default function LandingPage({ lang, change }) {
  const c = copy[lang] || copy.en;
  return <div className="landing-refined">
    <header className="landing-nav"><Brand/><nav aria-label="Landing page"><a href="#features">{c.nav[0]}</a><a href="#how">{c.nav[1]}</a><a href="#about">{c.nav[2]}</a></nav><div className="landing-nav-actions"><LanguageToggle lang={lang} change={change}/><Link to="/login" className="landing-login">{lang === 'hi' ? 'लॉगिन' : 'Login'}</Link><Link to="/register" className="landing-button">{c.start}<ArrowRight size={16}/></Link></div></header>
    <main>
      <section className="landing-hero"><div className="landing-hero-copy"><p className="landing-eyebrow"><span/> {c.eyebrow}</p><h1>{c.hero}</h1><p className="landing-lede">{c.heroText}</p><div className="landing-actions"><Link to="/register" className="landing-button">{c.start}<ArrowRight size={16}/></Link><a href="#features" className="landing-button outline">{c.explore}</a></div></div><div className="landing-hero-image"><img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85" alt={lang === 'hi' ? 'हरे खेत में स्वस्थ फसलें' : 'Healthy crops growing in a field'}/><div className="landing-image-caption"><span className="landing-caption-icon"><Sprout size={16}/></span><span>{lang === 'hi' ? 'बेहतर कृषि निर्णय' : 'Clearer agricultural decisions'}</span></div></div></section>
      <section id="features" className="landing-section"><div className="landing-section-heading"><div><p className="landing-eyebrow">{c.eyebrow}</p><h2>{c.offers}</h2></div><p>{c.offersText}</p></div><div className="landing-feature-grid">{c.features.map(([title, desc, route, Icon]) => <Link to={route} className="landing-feature-card" key={title}><span className="landing-feature-icon"><Icon size={20}/></span><h3>{title}</h3><p>{desc}</p><span className="landing-card-link">{lang === 'hi' ? 'टूल खोलें' : 'Open tool'} <ArrowRight size={14}/></span></Link>)}</div></section>
      <section id="how" className="landing-how"><div className="landing-section-heading"><div><p className="landing-eyebrow">{lang === 'hi' ? 'सरल प्रक्रिया' : 'A SIMPLE PROCESS'}</p><h2>{c.how}</h2></div></div><div className="landing-steps">{c.steps.map(([title, desc], i) => <div className="landing-step" key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{desc}</p></div></div>)}</div></section>
      <section id="about" className="landing-about"><p className="landing-eyebrow">{lang === 'hi' ? 'परियोजना के बारे में' : 'ABOUT THE PROJECT'}</p><h2>{c.about}</h2><p>{c.aboutText}</p><h3 className="landing-team-title">{c.team}</h3><div className="landing-team-grid">{c.teamMembers.map(([name, role, initials]) => <div className="landing-team-card" key={name}><span className="landing-team-initials">{initials}</span><strong>{name}</strong><span>{role}</span></div>)}</div></section>
      <section className="landing-cta"><div><h2>{c.cta}</h2><p>{c.ctaText}</p></div><Link to="/register" className="landing-button light">{c.start}<ArrowRight size={16}/></Link></section>
    </main>
    <footer className="landing-footer"><Brand/><div><a href="#features">{c.nav[0]}</a><a href="#how">{c.nav[1]}</a><a href="#about">{c.nav[2]}</a></div><span>{c.footer}</span></footer>
  </div>;
}
