import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import {
  Fab,
  Drawer,
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { MessageCircle, X, Send } from 'lucide-react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export const Chatbot = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: 'Merhaba! Size nasıl yardımcı olabilirim? Restoran analitiği hakkında sorularınızı sorabilirsiniz.',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    setInputValue('');
    setLoading(true);
    try {
      const payload = {
        messages: [
          { role: 'system', content: 'You are a helpful restaurant analytics assistant that answers concisely in Turkish.' },
          { role: 'user', content: inputValue },
        ],
        userId: user?.id,
      };
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        let msg = 'chat_failed';
        let detail: string | undefined;
        try {
          const j = (await resp.json()) as { error?: string; detail?: string };
          if (j?.error) msg = j.error;
          if (j?.detail) detail = j.detail;
        } catch {}
  const err: any = new Error(detail || msg);
  err.code = msg;
  throw err;
      }
      const data = (await resp.json()) as { reply?: string; model?: string };
      const botResponse: Message = {
        text: data.reply
          ? data.reply + (data.model === 'analytics' ? '\n\n(Kaynak: Veritabanı analitiği)' : '')
          : 'Üzgünüm, şu anda yanıt veremiyorum.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (e) {
      const code = (e as any)?.code as string | undefined;
      const errorText = e instanceof Error ? e.message : 'chat_failed';
      const fallback: Message = {
        text:
          code === 'API_KEY_INVALID'
            ? 'AI anahtarı geçersiz veya kısıtlı. Lütfen AI Studio’dan yeni bir anahtar oluşturup backend .env dosyasına ekleyin ve sunucuyu yeniden başlatın.'
            : errorText === 'Missing GOOGLE_GENAI_API_KEY'
            ? 'Sunucu yapılandırılmamış: GOOGLE_GENAI_API_KEY eksik. Lütfen backend .env dosyasına anahtarı ekleyin.'
            : getBotResponse(userMessage.text),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  const getBotResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('gelir') || lowerInput.includes('revenue')) {
      return 'Gelir analizinizi görmek için yukarıdaki filtreleri kullanarak belirli bir tarih aralığı seçebilirsiniz. KPI kartlarında toplam gelirinizi görebilirsiniz.';
    } else if (lowerInput.includes('sipariş') || lowerInput.includes('order')) {
      return 'Yeni sipariş eklemek için sol üstteki "Yeni Sipariş Ekle" formunu kullanabilirsiniz. Menü grubu, servis türü ve ürün adını seçerek sipariş oluşturabilirsiniz.';
    } else if (lowerInput.includes('rapor') || lowerInput.includes('report')) {
      return 'Detaylı raporlar için grafikleri inceleyebilirsiniz. Menü gruplarına göre gelir, servis türüne göre dağılım ve en çok satan ürünleri görebilirsiniz.';
    } else if (lowerInput.includes('filtre') || lowerInput.includes('filter')) {
      return 'Filtre bölümünden tarih aralığı, periyot (günlük/aylık) ve menü grubu seçerek verileri filtreleyebilirsiniz.';
    } else if (lowerInput.includes('yardım') || lowerInput.includes('help')) {
      return 'Size şu konularda yardımcı olabilirim:\n- Gelir analizi\n- Sipariş ekleme\n- Raporlar\n- Filtreleme\n- Genel kullanım';
    } else {
      return 'Anlamadım, başka bir şekilde sorar mısınız? "Yardım" yazarak neler yapabileceğimi öğrenebilirsiniz.';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="chat"
        onClick={handleToggle}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <MessageCircle size={24} />
      </Fab>

      <Drawer
        anchor="right"
        open={open}
        onClose={handleToggle}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 } },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MessageCircle size={24} color="#1976d2" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Asistan
              </Typography>
            </Box>
            <IconButton onClick={handleToggle} size="small">
              <X size={20} />
            </IconButton>
          </Paper>

          <List sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
            {messages.map((message, index) => (
              <ListItem
                key={index}
                sx={{
                  flexDirection: 'column',
                  alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    bgcolor: message.sender === 'user' ? '#1976d2' : '#fff',
                    color: message.sender === 'user' ? '#fff' : '#000',
                  }}
                >
                  <ListItemText
                    primary={message.text}
                    primaryTypographyProps={{
                      sx: { fontSize: '0.9rem', whiteSpace: 'pre-line' },
                    }}
                  />
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {message.timestamp.toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </ListItem>
            ))}
          </List>

          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="Mesajınızı yazın..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                size="small"
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || loading}
              >
                <Send size={20} />
              </IconButton>
            </Box>
            {loading && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Asistan yazıyor...
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
