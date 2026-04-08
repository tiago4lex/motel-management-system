import { useState, useCallback } from 'react';

class TTSService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.ptBrVoice = null;
    
    this.loadVoices();
  }
  
  loadVoices() {
    this.voices = this.synth.getVoices();
    this.ptBrVoice = this.voices.find(voice => 
      voice.lang === 'pt-BR' || voice.lang === 'pt'
    );
  }
  
  speak(text, options = {}) {
    if (!this.synth) {
      console.warn('TTS não suportado neste navegador');
      return;
    }
    
    // Cancelar qualquer fala em andamento
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'pt-BR';
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    if (this.ptBrVoice) {
      utterance.voice = this.ptBrVoice;
    }
    
    this.synth.speak(utterance);
  }
  
  announceRoomAvailable(roomNumber, roomType) {
    const message = `Quarto ${roomNumber}, tipo ${roomType}, está disponível.`;
    this.speak(message);
  }
  
  announceCheckout(roomNumber, totalAmount) {
    const message = `Quarto ${roomNumber}, valor total a pagar: ${totalAmount.toFixed(2)} reais.`;
    this.speak(message);
  }
  
  announceConsumption(roomNumber, productName, quantity, total) {
    const message = `Quarto ${roomNumber}, adicionado ${quantity} ${productName}, totalizando ${total.toFixed(2)} reais.`;
    this.speak(message);
  }
}

export const useTTS = () => {
  const [ttsService] = useState(() => new TTSService());
  
  const speak = useCallback((text, options) => {
    ttsService.speak(text, options);
  }, [ttsService]);
  
  return { ttsService, speak };
};