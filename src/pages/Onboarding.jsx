import { useState } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { DEFAULT_CATEGORIES } from '../utils/constants';

export default function Onboarding() {
  const { completeOnboarding, language, t } = useBusiness();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState([]);

  const toggleCategory = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    completeOnboarding(selected.length > 0 ? selected : DEFAULT_CATEGORIES.map((c) => c.id));
  };

  if (step === 0) {
    return (
      <div className="onboarding">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div className="onboarding-logo-wrapper">
            <img src="/logo.png" alt="My Dukaan Logo" className="onboarding-logo animate-pop" />
          </div>
          <h1>{t.welcome}</h1>
          <p>{t.welcomeDesc}</p>
        </div>
        <div className="onboarding-footer">
          <button className="btn btn--primary btn--lg" onClick={() => setStep(1)} id="btn-get-started">
            {t.getStarted}
          </button>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="onboarding">
        <div style={{ flex: 1 }}>
          <div className="onboarding-illustration">👗</div>
          <h1>{t.whatDoYouSell}</h1>
          <p>{language === 'ta' ? 'நீங்கள் விற்கும் வகைகளைத் தேர்ந்தெடுக்கவும்' : 'Select the categories you deal in'}</p>
          <div className="onboarding-categories">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`onboarding-cat ${selected.includes(cat.id) ? 'selected' : ''}`}
                onClick={() => toggleCategory(cat.id)}
                id={`cat-${cat.id}`}
              >
                <div style={{ fontSize: 28, marginBottom: 4 }}>{cat.emoji}</div>
                {language === 'ta' ? (cat.nameTa || cat.name) : cat.name}
              </button>
            ))}
          </div>
        </div>
        <div className="onboarding-footer" style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn--ghost" onClick={handleFinish} id="btn-skip">
            {t.skip}
          </button>
          <button className="btn btn--primary btn--lg" onClick={() => setStep(2)} style={{ flex: 1 }} id="btn-next">
            {language === 'ta' ? 'அடுத்து' : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="onboarding-illustration">🎉</div>
        <h1>{t.youreReady}</h1>
        <p>{t.readyDesc}</p>
      </div>
      <div className="onboarding-footer">
        <button className="btn btn--primary btn--lg" onClick={handleFinish} id="btn-lets-go">
          {t.letsGo}
        </button>
      </div>
    </div>
  );
}
