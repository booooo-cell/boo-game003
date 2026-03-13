import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, Leaf, RefreshCw, Play } from 'lucide-react';

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface Dewdrop extends Point {
  id: number;
  radius: number;
  opacity: number;
  flash: number;
}

interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// --- Constants ---
const WIN_SCORE = 10;
const FROG_SIZE = 80;
const TONGUE_SPEED = 15;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won'>('start');
  const [score, setScore] = useState(0);
  
  // Game Refs
  const dewdropsRef = useRef<Dewdrop[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const tongueRef = useRef<{ 
    active: boolean, 
    target: Point | null, 
    current: Point, 
    state: 'shooting' | 'returning' 
  }>({
    active: false,
    target: null,
    current: { x: 0, y: 0 },
    state: 'shooting'
  });
  const frogStateRef = useRef<'idle' | 'happy'>('idle');
  const happyTimerRef = useRef(0);

  const spawnDewdrop = useCallback((width: number, height: number) => {
    const margin = 50;
    dewdropsRef.current.push({
      id: Date.now() + Math.random(),
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2.5), // Keep away from bottom
      radius: 6 + Math.random() * 4,
      opacity: 0.8,
      flash: 0
    });
  }, []);

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color
      });
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    dewdropsRef.current = [];
    particlesRef.current = [];
    tongueRef.current = {
      active: false,
      target: null,
      current: { x: 0, y: 0 },
      state: 'shooting'
    };
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Initial dewdrops
    spawnDewdrop(canvas.width, canvas.height);

    let animationFrameId: number;

    const update = () => {
      const frogX = canvas.width / 2;
      const frogY = canvas.height - 100;

      // Tongue Logic
      if (tongueRef.current.active && tongueRef.current.target) {
        const t = tongueRef.current;
        const dx = t.target.x - frogX;
        const dy = t.target.y - frogY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;

        if (t.state === 'shooting') {
          t.current.x += ux * TONGUE_SPEED;
          t.current.y += uy * TONGUE_SPEED;

          // Check hit
          dewdropsRef.current.forEach((drop, index) => {
            const ddx = t.current.x - drop.x;
            const ddy = t.current.y - drop.y;
            const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (ddist < drop.radius + 10) {
              // Hit!
              createParticles(drop.x, drop.y, '#93c5fd');
              dewdropsRef.current.splice(index, 1);
              setScore(s => {
                const newScore = s + 1;
                if (newScore >= WIN_SCORE) setGameState('won');
                return newScore;
              });
              t.state = 'returning';
              frogStateRef.current = 'happy';
              happyTimerRef.current = 30;
              spawnDewdrop(canvas.width, canvas.height);
            }
          });

          // Check reach target or max length
          const curDist = Math.sqrt((t.current.x - frogX) ** 2 + (t.current.y - frogY) ** 2);
          if (curDist >= dist || curDist > 500) {
            t.state = 'returning';
          }
        } else {
          // Returning
          t.current.x -= ux * TONGUE_SPEED;
          t.current.y -= uy * TONGUE_SPEED;

          const curDist = Math.sqrt((t.current.x - frogX) ** 2 + (t.current.y - frogY) ** 2);
          if (curDist < 20) {
            t.active = false;
            t.target = null;
          }
        }
      }

      // Happy Timer
      if (happyTimerRef.current > 0) {
        happyTimerRef.current--;
        if (happyTimerRef.current === 0) frogStateRef.current = 'idle';
      }

      // Particles
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      });

      // Dewdrops animation
      dewdropsRef.current.forEach(drop => {
        drop.flash += 0.05;
        drop.opacity = 0.6 + Math.sin(drop.flash) * 0.2;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const frogX = canvas.width / 2;
      const frogY = canvas.height - 100;

      // Draw Grass (Simple swaying lines)
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2;
      const time = Date.now() * 0.002;
      for (let i = 0; i < canvas.width; i += 20) {
        const offset = Math.sin(time + i * 0.1) * 5;
        ctx.beginPath();
        ctx.moveTo(i, canvas.height);
        ctx.quadraticCurveTo(i + offset, canvas.height - 30, i + offset * 1.5, canvas.height - 60);
        ctx.stroke();
      }

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Tongue
      if (tongueRef.current.active) {
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(frogX, frogY - 20);
        ctx.lineTo(tongueRef.current.current.x, tongueRef.current.current.y);
        ctx.stroke();
        
        // Tongue Tip
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(tongueRef.current.current.x, tongueRef.current.current.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Frog
      ctx.save();
      ctx.translate(frogX, frogY);
      
      // Body
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-20, -25, 15, 0, Math.PI * 2);
      ctx.arc(20, -25, 15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-20, -25, 6, 0, Math.PI * 2);
      ctx.arc(20, -25, 6, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (frogStateRef.current === 'happy') {
        ctx.arc(0, 0, 15, 0, Math.PI);
      } else {
        ctx.moveTo(-15, 5);
        ctx.quadraticCurveTo(0, 15, 15, 5);
      }
      ctx.stroke();
      
      ctx.restore();

      // Draw Dewdrops
      dewdropsRef.current.forEach(drop => {
        const grad = ctx.createRadialGradient(drop.x - 2, drop.y - 2, 0, drop.x, drop.y, drop.radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${drop.opacity})`);
        grad.addColorStop(1, `rgba(147, 197, 253, ${drop.opacity * 0.5})`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(drop.x - drop.radius * 0.3, drop.y - drop.radius * 0.3, drop.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // HUD
      ctx.font = '24px "ZCOOL KuaiLe"';
      ctx.fillStyle = '#166534';
      ctx.textAlign = 'center';
      ctx.fillText(`已收集露珠: ${score} / ${WIN_SCORE}`, canvas.width / 2, 50);
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [gameState, score, spawnDewdrop]);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;
    if (tongueRef.current.active) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    tongueRef.current = {
      active: true,
      target: { x, y },
      current: { x: canvas.width / 2, y: canvas.height - 120 },
      state: 'shooting'
    };
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      <AnimatePresence>
        {gameState === 'start' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 start-screen flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="mb-8"
            >
              <div className="relative">
                <div className="w-32 h-24 bg-green-400 rounded-full relative">
                  <div className="absolute -top-4 left-4 w-10 h-10 bg-white rounded-full border-4 border-green-600">
                    <div className="w-4 h-4 bg-black rounded-full m-2" />
                  </div>
                  <div className="absolute -top-4 right-4 w-10 h-10 bg-white rounded-full border-4 border-green-600">
                    <div className="w-4 h-4 bg-black rounded-full m-2" />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-4 border-b-4 border-green-800 rounded-full" />
                </div>
              </div>
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl text-green-800 mb-6 font-cute text-shadow-green">
              小青蛙抓露珠
            </h1>
            <p className="text-green-700 mb-12 max-w-xs leading-relaxed">
              点击屏幕，帮小青蛙用舌头抓住晶莹的露珠吧！收集10个即可通关。
            </p>
            
            <button onClick={startGame} className="btn-green flex items-center gap-3">
              <Play className="w-6 h-6 fill-current" />
              开始游戏
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-0"
            onMouseDown={handleInteraction}
            onTouchStart={handleInteraction}
          >
            <canvas ref={canvasRef} className="w-full h-full" />
          </motion.div>
        )}

        {gameState === 'won' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 win-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -50, x: Math.random() * 100 + '%' }}
                  animate={{ y: '110vh', rotate: 360 }}
                  transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5 }}
                  className="absolute"
                >
                  {i % 2 === 0 ? <Leaf className="text-green-400 w-6 h-6" /> : <Sparkles className="text-yellow-400 w-4 h-4" />}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="bg-white/80 backdrop-blur-sm p-8 rounded-[40px] border-4 border-green-400 shadow-xl max-w-sm relative z-10"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-green-100 p-4 rounded-full">
                  <Heart className="w-12 h-12 text-red-400 fill-current animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-3xl text-green-800 mb-6 font-cute">恭喜通关Xc</h2>
              
              <div className="space-y-4 text-green-700 leading-relaxed font-cute text-lg">
                <p>祝你发大财，瘦到90斤，越来越美丽，</p>
                <p className="text-green-900 font-bold">早日提宾利，</p>
                <p>耍一个五官端正、三观契合、为人正直、</p>
                <p>幽默高智、爱爆金币的五好男！</p>
              </div>

              <button 
                onClick={startGame} 
                className="mt-10 btn-green flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-5 h-5" />
                再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background elements for Start/Won screens */}
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none z-10">
        <div className="flex justify-around items-end h-full px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="sway origin-bottom">
              <div className="w-1 h-16 bg-green-300 rounded-full" />
              <div className="w-4 h-4 bg-green-400 rounded-full -mt-16 -ml-1.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
