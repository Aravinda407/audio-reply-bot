import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Send, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isVoice?: boolean;
}

interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  isSpeaking: boolean;
  error?: string;
}

export const VoiceChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isSupported: false,
    isSpeaking: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize Speech APIs
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;

    if (SpeechRecognition && speechSynthesis) {
      recognitionRef.current = new SpeechRecognition();
      synthesisRef.current = speechSynthesis;

      // Configure speech recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      setVoiceState(prev => ({ ...prev, isSupported: true }));

      // Add event listeners
      recognitionRef.current.onstart = () => {
        setVoiceState(prev => ({ ...prev, isListening: true, error: undefined }));
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setVoiceState(prev => ({ ...prev, isListening: false }));
        
        // Auto-send voice messages
        if (transcript.trim()) {
          handleSendMessage(transcript, true);
        }
      };

      recognitionRef.current.onerror = (event) => {
        setVoiceState(prev => ({ 
          ...prev, 
          isListening: false, 
          error: `Speech recognition error: ${event.error}` 
        }));
        toast({
          title: "Voice Recognition Error",
          description: `Failed to recognize speech: ${event.error}`,
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };
    } else {
      setVoiceState(prev => ({ 
        ...prev, 
        isSupported: false, 
        error: 'Speech APIs not supported in this browser' 
      }));
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support Web Speech API. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !voiceState.isSupported) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: "Voice Error",
        description: "Could not start voice recognition",
        variant: "destructive",
      });
    }
  }, [voiceState.isSupported, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && voiceState.isListening) {
      recognitionRef.current.stop();
    }
  }, [voiceState.isListening]);

  const speakText = useCallback((text: string) => {
    if (!synthesisRef.current || !speechEnabled) return;

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
    };

    utterance.onend = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    };

    utterance.onerror = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      toast({
        title: "Speech Error",
        description: "Could not speak the response",
        variant: "destructive",
      });
    };

    synthesisRef.current.speak(utterance);
  }, [speechEnabled, toast]);

  const generateMockAIResponse = useCallback((userMessage: string): string => {
    const responses = [
      "That's an interesting question! I'd be happy to help you with that.",
      "I understand what you're asking. Let me think about the best way to assist you.",
      "Thank you for sharing that with me. Here's what I think about your query.",
      "That's a great point! I can provide some insights on that topic.",
      "I appreciate you using voice to communicate with me. It makes our conversation more natural!",
      "Voice interaction is amazing, isn't it? I love being able to respond to your spoken words.",
    ];
    
    // Simple keyword-based responses
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      return "Hello! It's great to hear your voice. How can I assist you today?";
    }
    
    if (userMessage.toLowerCase().includes('how are you')) {
      return "I'm doing well, thank you for asking! I'm excited to be talking with you through voice.";
    }
    
    if (userMessage.toLowerCase().includes('voice') || userMessage.toLowerCase().includes('speech')) {
      return "Yes, I can hear and respond to your voice! This Web Speech API integration allows us to have natural conversations.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }, []);

  const handleSendMessage = useCallback(async (text?: string, isVoice = false) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      isVoice,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponse = generateMockAIResponse(messageText);
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Speak AI response
      if (speechEnabled) {
        speakText(aiResponse);
      }
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: "AI Error",
        description: "Failed to generate AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputText, generateMockAIResponse, speakText, speechEnabled, toast]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getVoiceButtonVariant = () => {
    if (!voiceState.isSupported) return 'voice-disabled';
    if (voiceState.isListening) return 'voice-recording';
    return 'voice';
  };

  return (
    <div className="min-h-screen bg-gradient-chat p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-ai bg-clip-text text-transparent mb-2">
            AI Voice Chatbot
          </h1>
          <p className="text-muted-foreground">
            Speak naturally or type your messages - I'll respond with both text and voice!
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-3 w-3 rounded-full",
                voiceState.isSupported ? "bg-success" : "bg-destructive"
              )} />
              <span className="text-sm text-muted-foreground">
                Voice {voiceState.isSupported ? 'Ready' : 'Unavailable'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSpeechEnabled(!speechEnabled)}
              className="gap-2"
            >
              {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {speechEnabled ? 'Speech On' : 'Speech Off'}
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="bg-card/50 backdrop-blur-sm shadow-chat mb-6 max-h-96 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-lg mb-2">Start your conversation!</p>
                <p className="text-sm">Click the microphone to speak, or type your message below.</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex animate-fade-in",
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                    message.sender === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground border"
                  )}
                >
                  <p className="text-sm">{message.text}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.isVoice && <Mic className="h-3 w-3" />}
                    {message.sender === 'ai' && voiceState.isSpeaking && (
                      <div className="flex gap-1">
                        <div className="w-1 h-3 bg-current animate-wave" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-3 bg-current animate-wave" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-3 bg-current animate-wave" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-background text-foreground border rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Section */}
        <Card className="bg-card/50 backdrop-blur-sm shadow-chat p-4">
          <div className="flex items-center gap-4">
            {/* Voice Button */}
            <Button
              variant={getVoiceButtonVariant()}
              size="voice"
              onClick={voiceState.isListening ? stopListening : startListening}
              disabled={!voiceState.isSupported}
              className="shrink-0"
            >
              {voiceState.isListening ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            {/* Text Input */}
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={voiceState.isListening ? "Listening..." : "Type your message or use voice..."}
              className="flex-1"
              disabled={voiceState.isListening}
            />

            {/* Send Button */}
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              variant="ai"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {voiceState.error && (
            <p className="text-destructive text-xs mt-2">{voiceState.error}</p>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Built with Web Speech API • React • TypeScript</p>
          <p className="mt-1">
            {voiceState.isSupported ? 
              "🎤 Voice recognition active" : 
              "⚠️ Please use Chrome, Edge, or Safari for voice features"
            }
          </p>
        </div>
      </div>
    </div>
  );
};