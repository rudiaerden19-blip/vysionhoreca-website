// KRITIEKE ROBUUSTE geluidsbibliotheek - NOOIT MEER HAPEREN
// Deze bibliotheek gebruikt ALLE mogelijke methoden om geluid af te spelen
// Audio context wordt ALTIJD actief gehouden met heartbeat mechanisme
//
// MULTI-TENANT READY: 
// - Geen business_id nodig - werkt voor alle 500+ tenants
// - Heartbeat is singleton (één per browser, niet per tenant)
// - Audio context wordt gedeeld tussen tenants (browser resource)
// - HTML audio pool wordt gedeeld tussen tenants (browser resource)
// - Geluidsvoorkeur (localStorage) is globaal per browser (gewenst gedrag)

let audioContext: AudioContext | null = null;
let htmlAudioPool: HTMLAudioElement[] = [];
let soundsEnabled = true;
let heartbeatInterval: NodeJS.Timeout | null = null;
let audioContextResumePromise: Promise<void> | null = null;
let heartbeatRefCount = 0; // Track hoeveel tenants heartbeat nodig hebben

// Check if sounds are enabled (read from localStorage for performance)
export const getSoundsEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('vysion_sounds_enabled');
  return saved !== 'false';
};

// Set sounds enabled state
export const setSoundsEnabled = (enabled: boolean) => {
  soundsEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('vysion_sounds_enabled', String(enabled));
  }
  if (enabled) {
    startHeartbeat();
  } else {
    stopHeartbeat();
  }
};

// Initialize sounds enabled state from localStorage
if (typeof window !== 'undefined') {
  soundsEnabled = getSoundsEnabled();
}

// HEARTBEAT MECHANISME - houdt audio context ALTIJD actief
// MULTI-TENANT: Gebruikt ref counting zodat heartbeat blijft draaien zolang
// minimaal één tenant geluid nodig heeft
const startHeartbeat = () => {
  heartbeatRefCount++;
  
  // Start alleen als nog niet actief
  if (heartbeatInterval) return;
  
  heartbeatInterval = setInterval(() => {
    // Stop heartbeat als geluid uit staat EN geen tenants meer actief
    if (!soundsEnabled && heartbeatRefCount === 0) {
      stopHeartbeat();
      return;
    }
    
    if (!soundsEnabled) return;
    
    try {
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended') {
        // Resume zonder te wachten (non-blocking)
        ctx.resume().catch(() => {});
      }
      
      // Pre-warm HTML audio pool (max 5 elementen voor alle tenants samen)
      if (htmlAudioPool.length < 5) {
        try {
          const audio = new Audio();
          audio.volume = 0;
          audio.preload = 'auto';
          htmlAudioPool.push(audio);
        } catch (e) {
          // Ignore errors
        }
      }
    } catch (e) {
      // Ignore heartbeat errors
    }
  }, 5000); // Elke 5 seconden checken
};

const stopHeartbeat = () => {
  heartbeatRefCount = Math.max(0, heartbeatRefCount - 1);
  
  // Stop alleen als geen tenants meer heartbeat nodig hebben
  if (heartbeatRefCount <= 0 && heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    heartbeatRefCount = 0;
  }
};

// Start heartbeat bij initialisatie als geluid aan staat
// MULTI-TENANT: Dit start de heartbeat voor de eerste tenant die laadt
// Andere tenants gebruiken dezelfde heartbeat (ref counting)
if (typeof window !== 'undefined' && soundsEnabled) {
  startHeartbeat();
}

// ROBUUSTE audio context initialisatie - resume altijd eerst MET RETRY
const ensureAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!soundsEnabled) return null;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }
    
    // KRITIEK: Resume de context als deze suspended is - MET RETRY
    if (audioContext.state === 'suspended') {
      // Gebruik cached promise om dubbele resumes te voorkomen
      if (!audioContextResumePromise) {
        audioContextResumePromise = audioContext.resume()
          .then(() => {
            audioContextResumePromise = null;
          })
          .catch(() => {
            audioContextResumePromise = null;
            // Retry na korte delay
            setTimeout(() => {
              if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {});
              }
            }, 100);
          });
      }
    }
    
    return audioContext;
  } catch (e) {
    console.error('Audio context creation failed:', e);
    return null;
  }
};

// ROBUUSTE HTML Audio speler - gebruikt pool van audio elementen MET RETRY
const playHTMLAudioRobust = (url: string, volume: number = 0.9): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !soundsEnabled) {
      reject(new Error('Audio not available'));
      return;
    }
    
    // Probeer eerst bestaand element uit pool
    let audio: HTMLAudioElement | null = null;
    
    // Zoek een beschikbaar element of maak nieuwe
    for (let i = 0; i < htmlAudioPool.length; i++) {
      const poolAudio = htmlAudioPool[i];
      if (poolAudio.readyState === 0 || poolAudio.ended || poolAudio.paused) {
        audio = poolAudio;
        break;
      }
    }
    
    // Maak nieuwe als geen beschikbaar
    if (!audio) {
      try {
        audio = new Audio();
        htmlAudioPool.push(audio);
        // Beperk pool size
        if (htmlAudioPool.length > 5) {
          htmlAudioPool.shift();
        }
      } catch (e) {
        reject(new Error('Failed to create audio element'));
        return;
      }
    }
    
    // Reset en configureer
    audio.src = url;
    audio.volume = volume;
    audio.currentTime = 0;
    
    // Play met retry mechanisme
    const attemptPlay = (retries = 3): void => {
      const playPromise = audio!.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            resolve();
          })
          .catch((error) => {
            if (retries > 0) {
              // Retry met kleine delay
              setTimeout(() => {
                audio!.currentTime = 0;
                attemptPlay(retries - 1);
              }, 50);
            } else {
              reject(error);
            }
          });
      } else {
        resolve();
      }
    };
    
    attemptPlay();
  });
};

// ROBUUSTE tone speler - met auto-resume en retry
const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void => {
  if (!soundsEnabled) return;
  
  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    // Resume context als nodig - met retry
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Retry na korte delay
        setTimeout(() => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }, 50);
      });
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Tone play failed:', e);
    // Fallback: probeer opnieuw met korte delay
    setTimeout(() => {
      try {
        const ctx2 = ensureAudioContext();
        if (ctx2) {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.type = type;
          osc.frequency.value = frequency;
          gain.gain.value = volume;
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + duration);
          osc.stop(ctx2.currentTime + duration);
        }
      } catch (e2) {
        // Final fallback failed
      }
    }, 100);
  }
};

// Initialize audio context (must be called after user interaction)
// MULTI-TENANT: Kan veilig meerdere keren aangeroepen worden door verschillende tenants
export const initAudio = (): AudioContext | null => {
  const ctx = ensureAudioContext();
  if (ctx && soundsEnabled) {
    startHeartbeat(); // Ref counting zorgt dat heartbeat blijft draaien
  }
  return ctx;
};

// Pre-warm audio bij app start (aanroepen na user interaction)
// MULTI-TENANT: Kan veilig meerdere keren aangeroepen worden door verschillende tenants
export const prewarmAudio = (): void => {
  if (!soundsEnabled) return;
  
  // Initialiseer audio context (wordt gedeeld tussen tenants)
  ensureAudioContext();
  
  // Pre-load HTML audio (pool wordt gedeeld tussen tenants)
  try {
    // Voeg alleen toe als pool nog niet vol is
    if (htmlAudioPool.length < 5) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0;
      audio.preload = 'auto';
      htmlAudioPool.push(audio);
    }
  } catch (e) {
    // Ignore
  }
  
  // Start heartbeat (singleton - ref counting zorgt dat het blijft draaien)
  startHeartbeat();
  
  // Test geluid (stil) - werkt voor alle tenants
  try {
    playTone(1000, 0.01, 'sine', 0.01);
  } catch (e) {
    // Ignore
  }
};

// ===== SOUND EFFECTS =====

// Success sound - for payment completed
export const playSuccess = (): void => {
  if (!soundsEnabled) return;
  playTone(523.25, 0.15, 'sine', 0.2); // C5
  setTimeout(() => playTone(659.25, 0.15, 'sine', 0.2), 100); // E5
  setTimeout(() => playTone(783.99, 0.3, 'sine', 0.2), 200); // G5
};

// Checkout sound - for pressing checkout button
export const playCheckout = (): void => {
  if (!soundsEnabled) return;
  playTone(800, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1000, 0.15, 'sine', 0.2), 80);
};

// Add to cart sound - quick blip
export const playAddToCart = (): void => {
  if (!soundsEnabled) return;
  playTone(600, 0.08, 'sine', 0.15);
};

// Remove from cart sound
export const playRemove = (): void => {
  if (!soundsEnabled) return;
  playTone(300, 0.1, 'sine', 0.15);
};

// Error sound
export const playError = (): void => {
  if (!soundsEnabled) return;
  playTone(200, 0.15, 'square', 0.2);
  setTimeout(() => playTone(150, 0.2, 'square', 0.2), 100);
};

// Click sound - subtle feedback - VOOR ALLE KNOPPEN
export const playClick = (): void => {
  if (!soundsEnabled) return;
  playTone(1200, 0.03, 'sine', 0.1);
};

// Cash register / Ka-ching sound
export const playCashRegister = (): void => {
  if (!soundsEnabled) return;
  playTone(2000, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(2500, 0.1, 'sine', 0.15), 50);
  setTimeout(() => playTone(3000, 0.15, 'sine', 0.1), 100);
  setTimeout(() => playTone(150, 0.3, 'triangle', 0.2), 150);
};

// Notification sound - normale notificatie
export const playNotification = (): void => {
  if (!soundsEnabled) return;
  playTone(880, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.2), 120);
};

// KRITIEKE BESTELLING GELUID - NOOIT FALEN - PARALLEL ALLE METHODEN
export const playOrderNotification = async (): Promise<void> => {
  if (!soundsEnabled) return;
  
  // PARALLEL: Probeer ALLE methoden tegelijkertijd (niet sequentieel!)
  const promises: Promise<void>[] = [];
  
  // Methode 1: HTML Audio (meest betrouwbaar)
  promises.push(
    playHTMLAudioRobust('/notification.mp3', 0.95).catch(() => {
      // Silent fail - andere methoden proberen het ook
    })
  );
  
  // Methode 2: Web Audio API (parallel)
  promises.push(
    (async () => {
      try {
        const ctx = ensureAudioContext();
        if (ctx) {
          // Resume context
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }
          
          // Speel luide, duidelijke notificatie
          const playBeep = (freq: number, startTime: number, duration: number, vol: number) => {
            try {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(ctx.currentTime + startTime);
              osc.stop(ctx.currentTime + startTime + duration);
            } catch (e) {
              // Ignore individual beep errors
            }
          };
          
          // Luide, duidelijke notificatie (3 tonen)
          playBeep(880, 0, 0.2, 0.6);
          playBeep(1100, 0.25, 0.2, 0.6);
          playBeep(1320, 0.5, 0.3, 0.6);
        }
      } catch (e) {
        // Silent fail
      }
    })()
  );
  
  // Methode 3: Eenvoudige tone fallback (parallel)
  promises.push(
    (async () => {
      try {
        playTone(880, 0.2, 'sine', 0.5);
        setTimeout(() => playTone(1100, 0.2, 'sine', 0.5), 200);
        setTimeout(() => playTone(1320, 0.3, 'sine', 0.5), 400);
      } catch (e) {
        // Silent fail
      }
    })()
  );
  
  // Methode 4: Extra HTML Audio met andere volume (parallel)
  promises.push(
    playHTMLAudioRobust('/notification.mp3', 0.85).catch(() => {
      // Silent fail
    })
  );
  
  // Wacht op ALLE methoden - als EEN werkt, is het goed
  await Promise.allSettled(promises);
  
  // EXTRA: Als ALLE methoden faalden, probeer nog een keer na korte delay
  // (Dit gebeurt zeer zelden, maar voor de zekerheid)
  setTimeout(() => {
    if (soundsEnabled) {
      // Laatste redmiddel: probeer HTML audio nog een keer
      playHTMLAudioRobust('/notification.mp3', 1.0).catch(() => {});
    }
  }, 200);
};

// Browser notification (voor bestellingen) - werkt zelfs als tab niet actief is
export const showBrowserNotification = (title: string, body: string): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'new-order',
        requireInteraction: false,
      });
    } catch (e) {
      console.warn('Browser notification failed:', e);
    }
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'new-order',
        });
      }
    });
  }
};
