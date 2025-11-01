import type { Request, Response } from 'express';
import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  computeRange,
  getSummary,
  getTopItems,
  getMenuGroupTotals,
  getServiceTypeTotals,
  getLastOrderStats,
  getFullContext,
  getWindow,
} from '../services/analytics.js';
import type { QuerySpec } from '../services/analytics.js';

const router = Router();

// Gemini (Google Generative AI) client will be created lazily to allow server to boot without an API key

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

async function tryGenerate(client: GoogleGenAI, candidates: string[], prompt: string): Promise<string | null> {
  for (const model of candidates) {
    try {
      const r = await client.models.generateContent({ model, contents: prompt } as any);
      // @ts-ignore
      const txt = (r as any)?.text ?? (r as any)?.output_text ?? '';
      if (txt && String(txt).trim()) return String(txt).trim();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/404|not found|unsupported/i.test(msg)) continue;
      throw e;
    }
  }
  return null;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, userId } = req.body as { messages: ChatMessage[]; userId?: string };
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages required' });
    }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY)?.trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GOOGLE_GENAI_API_KEY' });
    }

  // Default to the model from your provided snippet (can be overridden via env)
    const primaryModel = (process.env.GOOGLE_GENAI_MODEL || process.env.GENAI_MODEL || 'gemini-2.5-flash').trim();
    const extraModels = (process.env.GOOGLE_GENAI_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const modelCandidatesBase = [primaryModel, 'gemini-2.0-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
    const modelCandidates = Array.from(new Set([...extraModels, ...modelCandidatesBase]));

    // Current date context for LLM (always include, for all queries)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const dayOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][today.getDay()];
    const dateContext = `Bugünün tarihi: ${todayStr} (${dayOfWeek})`;

    let modelId: string | undefined;
    let reply: string | undefined;

    // Map OpenAI-like messages to Gemini chat history
    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    const nonSystem = messages.filter((m) => m.role !== 'system');
    const last = nonSystem[nonSystem.length - 1];
    if (!last || !last.content?.trim()) {
      return res.status(400).json({ error: 'empty_user_message' });
    }
    const history = nonSystem
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const transcript = nonSystem
      .map((m) => `${m.role === 'assistant' ? 'Asistan' : 'Kullanıcı'}: ${m.content}`)
      .join('\n');
    const userPrompt = systemText ? `${systemText}\n\n${transcript}` : transcript;
    
    // Try analytics first if userId is provided and intent matches
    if (userId) {

      // Fetch full context once for richer grounding
      let fullCtx;
      try {
        fullCtx = await getFullContext(userId);
      } catch (e) {
        console.error('Failed to fetch full context:', e);
        fullCtx = null;
      }

      const normalizeTr = (s: string) => s
        .toLowerCase()
        .replace(/ı/g,'i').replace(/İ/g,'i')
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c');
      const lastUserText = normalizeTr(last.content);
      // Determine potential intents
      const isSummary = /(gelir|ciro|ozet|kpi|toplam|ortalama|kazanc|hasilat)/.test(lastUserText);
      const isTop = /(en cok satan|top ?\d+|en cok|populer|en iyi)/.test(lastUserText);
      const isMenu = /(menu grubu|men[uü] grubu|kategori)/.test(lastUserText);
      const isService = /(servis t[uü]r|paket|yerinde)/.test(lastUserText);
      // Resolve date range once and reuse across intents
      let range: '7d'|'30d'|'month'|'thisWeek'|'lastWeek'|'today'|'yesterday'|'thisYear'|'lastMonth'|null = null;
      if (/son\s*7\s*gun/.test(lastUserText)) range = '7d';
      else if (/son\s*30\s*gun/.test(lastUserText)) range = '30d';
      else if (/(bu|ic)\s*ay/.test(lastUserText)) range = 'month';
      else if (/bug[uü]n|bugun/.test(lastUserText)) range = 'today';
      else if (/d[uü]n|dun/.test(lastUserText)) range = 'yesterday';
      else if (/(bu hafta)/.test(lastUserText)) range = 'thisWeek';
      else if (/(gecen hafta|gecenhafta)/.test(lastUserText)) range = 'lastWeek';
      else if (/(gecen ay|gecenay)/.test(lastUserText)) range = 'lastMonth';
      else if (/(bu yil|bu sene)/.test(lastUserText)) range = 'thisYear';
      const dr = computeRange(range);

      const isLatest = /(en son|son veri|son kayit|son gun|last|latest)/.test(lastUserText);
      if (isLatest) {
        const stats = await getLastOrderStats(userId, dr);
        if (!stats) return res.json({ reply: 'Kayıt bulunamadı.', model: 'analytics' });
        const facts = `${dateContext}\n\nEn son kayıt tarihi: ${stats.date}\nO günkü sipariş sayısı: ${stats.count}\nO günkü gelir: ${stats.totalRevenue} TL`;
        let reply = `En son veri ${stats.date} tarihinde girildi. O gün ${stats.count} sipariş ve toplam ₺${stats.totalRevenue.toFixed?.(2) ?? stats.totalRevenue} gelir var.`;
        try {
          const client = new GoogleGenAI({ apiKey } as any);
          const composed = await tryGenerate(
            client,
            modelCandidates,
            `${dateContext}\n\nAşağıdaki veritabanı bilgilerine dayanarak kullanıcıya doğal ve kısa bir Türkçe yanıt yaz. Bilgiler dışına çıkma.\n\nBilgiler:\n${facts}\n\nKullanıcı sorusu:\n${last.content}`
          );
          if (composed) reply = composed;
        } catch {}
        return res.json({ reply, model: 'analytics' });
      }
      
      if (isSummary) {
        const s = await getSummary(userId, dr);
        let contextBlock = '';
        if (fullCtx) {
          contextBlock = `\n\nGenel bağlam:\n- Toplam sipariş sayısı: ${fullCtx.totalOrders}\n- Farklı menü grubu: ${fullCtx.distinctMenuGroups}\n- Farklı ürün: ${fullCtx.distinctItems}\n- Farklı servis türü: ${fullCtx.distinctServiceTypes}\n- En çok sipariş edilen ürün: ${fullCtx.mostOrderedItem?.item_name || '-'} (${fullCtx.mostOrderedItem?.count || 0} sipariş)\n- Son 1 ay sipariş sayısı: ${fullCtx.lastMonthOrderCount}\n- Son 1 ayda en popüler menü grubu: ${fullCtx.lastMonthTopMenuGroup?.menu_group || '-'} (${fullCtx.lastMonthTopMenuGroup?.count || 0} sipariş)\n- Son 1 ayda en popüler ürün: ${fullCtx.lastMonthTopItem?.item_name || '-'} (${fullCtx.lastMonthTopItem?.count || 0} sipariş)\n- Son 1 ayda yüksek hacim (≥450 sipariş): ${fullCtx.hasHighVolumeLastMonth ? 'EVET' : 'HAYIR'}`;
        }
        const facts = `${dateContext}\n\nSeçili dönem özet:\n- Toplam gelir: ${s.totalRevenue.toFixed(2)} TL\n- Sipariş sayısı: ${s.orderCount}\n- Ortalama sepet: ${s.averageOrder.toFixed(2)} TL${contextBlock}`;
        let reply = `Seçili aralık için özet:\n- ${facts.replace(/\n/g, '\n- ')}`;
        try {
          const client = new GoogleGenAI({ apiKey } as any);
          const composed = await tryGenerate(
            client,
            modelCandidates,
            `${dateContext}\n\nAşağıdaki veritabanı bilgilerini KESIN KAYNAK olarak kullanarak kullanıcı sorusuna Türkçe ve öz bir yanıt yaz. Sadece verilen bilgilere dayan. Gerekirse kritik bilgileri vurgula.\n\nBilgiler:\n${facts}\n\nKullanıcı sorusu:\n${last.content}`
          );
          if (composed) reply = composed;
        } catch {}
        return res.json({ reply, model: 'analytics' });
      }
      if (isTop) {
        const limitMatch = lastUserText.match(/top\s*(\d+)/);
        const limit = Math.max(1, Math.min(20, Number(limitMatch?.[1] || 5)));
        const rows = await getTopItems(userId, dr, limit);
        if (rows.length === 0) return res.json({ reply: 'Bu aralıkta kayıt bulunamadı.', model: 'analytics' });
        const facts = rows.map((r, i) => `${i+1}. ${r.item}: ${r.revenue.toFixed(2)} TL`).join('\n');
        let reply = `En çok satan ürünler:\n${facts}`;
        try {
          const client = new GoogleGenAI({ apiKey } as any);
          const composed = await tryGenerate(
            client,
            modelCandidates,
            `${dateContext}\n\nAşağıdaki veritabanı bilgilerine dayanarak Türkçe ve öz bir yanıt yaz. Gerekirse kısa çıkarımlar yap, ama uydurma bilgi verme.\n\nEn çok satanlar:\n${facts}\n\nKullanıcı sorusu:\n${last.content}`
          );
          if (composed) reply = composed;
        } catch {}
        return res.json({ reply, model: 'analytics' });
      }
      if (isMenu) {
        const rows = await getMenuGroupTotals(userId, dr);
        if (rows.length === 0) return res.json({ reply: 'Bu aralıkta kayıt bulunamadı.', model: 'analytics' });
        const facts = rows.map((r) => `${r.menuGroup}: ${r.revenue.toFixed(2)} TL`).join('\n');
        let reply = `Menü grubu gelir dağılımı:\n${facts}`;
        try {
          const client = new GoogleGenAI({ apiKey } as any);
          const composed = await tryGenerate(
            client,
            modelCandidates,
            `${dateContext}\n\nAşağıdaki menü grubu gelir dağılımına dayanarak Türkçe ve öz bir yanıt yaz.\n\nDağılım:\n${facts}\n\nKullanıcı sorusu:\n${last.content}`
          );
          if (composed) reply = composed;
        } catch {}
        return res.json({ reply, model: 'analytics' });
      }
      if (isService) {
        const rows = await getServiceTypeTotals(userId, dr);
        if (rows.length === 0) return res.json({ reply: 'Bu aralıkta kayıt bulunamadı.', model: 'analytics' });
        const facts = rows.map((r) => `${r.serviceType}: ${r.revenue.toFixed(2)} TL`).join('\n');
        let reply = `Servis türüne göre gelir:\n${facts}`;
        try {
          const client = new GoogleGenAI({ apiKey } as any);
          const composed = await tryGenerate(
            client,
            modelCandidates,
            `${dateContext}\n\nAşağıdaki servis türü gelirlerine dayanarak Türkçe ve öz bir yanıt yaz.\n\nDağılım:\n${facts}\n\nKullanıcı sorusu:\n${last.content}`
          );
          if (composed) reply = composed;
        } catch {}
        return res.json({ reply, model: 'analytics' });
      }

      // Generic NL→Spec→Aggregation fallback (safe JSON, no raw SQL)
      try {
        const client = new GoogleGenAI({ apiKey } as any);
        const schema = `JSON şeması:\n{
  "metric": "sum|avg|count",
  "field": "amount" (sum/avg için zorunlu),
  "groupBy": "none|day|menu_group|service_type|item_name",
  "limit": number (opsiyonel, default=20),
  "range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } (opsiyonel),
  "filters": { "menu_group"?: string, "item_name"?: string, "service_type"?: string }
}`;
        const prompt = `${dateContext}\n\nAşağıdaki kullanıcı sorusunu oku ve yukarıdaki JSON şemasına TAM UYAN, SADECE JSON dönen bir sorgu belirtimi üret. Açıklama yazma, kod bloğu kullanma, sadece JSON yaz. Uydurma alan ekleme. Tarih aralığı belirtilmemişse boş bırak.\n\nSoru:\n${last.content}\n\n${schema}`;
        const jsonText = await tryGenerate(client, modelCandidates, prompt);
        if (jsonText) {
          const trimmed = jsonText.trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
          const spec = JSON.parse(trimmed) as QuerySpec;
          // sanitize
          const allowedMetrics = new Set(['sum','avg','count']);
          const allowedGroup = new Set(['none','day','menu_group','service_type','item_name']);
          if (!allowedMetrics.has(spec.metric)) throw new Error('bad_metric');
          if (spec.metric !== 'count' && spec.field !== 'amount') spec.field = 'amount';
          if (spec.groupBy && !allowedGroup.has(spec.groupBy)) spec.groupBy = 'none';
          const result = await import('../services/analytics.js').then(m => m.runQuerySpec(userId, spec));
          if (result?.rows?.length) {
            // Try LLM composition with facts
            const factsJson = JSON.stringify(result);
            let reply: string | null = null;
            try {
              const composed = await tryGenerate(
                client,
                modelCandidates,
                `${dateContext}\n\nAşağıdaki veritabanı sonuçlarına dayanarak kullanıcıya doğal, kısa ve net bir Türkçe yanıt yaz. Yalnızca verilen sonuçlara dayan. Gerekirse 1-2 cümlelik açıklama ekle.\n\nSonuclar(JSON):\n${factsJson}\n\nKullanıcı sorusu:\n${last.content}`
              );
              if (composed) reply = composed;
            } catch {}
            if (!reply) {
              // Descriptive fallback text
              if (result.groupBy === 'none') {
                reply = `Veritabanı sonucu: ${result.metric === 'count' ? result.rows[0].value : (result.rows[0].value + ' TL')}.`;
              } else {
                const lines = result.rows.map((r: any, i: number) => `${i+1}. ${r.key}: ${r.value}${result.metric === 'count' ? '' : ' TL'}`).join('\n');
                reply = `Veritabanı sonuçları:\n${lines}`;
              }
            }
            return res.json({ reply, model: 'analytics' });
          }
        }
      } catch {}
    }

    // General LLM fallback: dateContext already defined at top of route
    const enrichedPrompt = `${dateContext}\n\n${userPrompt}`;

    let success = false;
    const client = new GoogleGenAI({ apiKey } as any);
    for (const candidate of modelCandidates) {
      try {
        modelId = candidate;
        const r = await client.models.generateContent({
          model: modelId,
          contents: enrichedPrompt,
        } as any);
        // New SDK returns response.text (per example)
        // @ts-ignore
        reply = (r as any)?.text ?? (r as any)?.output_text ?? '';
        if (!reply) reply = 'Yanıt alınamadı.';
        success = true;
        break;
      } catch (inner) {
        const msg = inner instanceof Error ? inner.message : String(inner);
        if (/404|not found|unsupported|model/i.test(msg)) {
          continue; // try next model
        }
        throw inner; // other errors (e.g., API key)
      }
    }
    if (!success) throw new Error('no_supported_model_for_api_version');

  return res.json({ reply, model: modelId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Chat error:', err);
    const message = err instanceof Error ? err.message : 'chat_failed';
    const isKey = /API key not valid|API_KEY_INVALID|missing api key|no api key/i.test(message);
    const status = isKey ? 401 : 500;
    return res.status(status).json({
      error: isKey ? 'API_KEY_INVALID' : message,
      detail: isKey
        ? 'Geçersiz veya kısıtlı Google AI Studio anahtarı. AI Studio’dan yeni bir anahtar oluşturup .env dosyasına ekleyin; application restrictions: None; API restrictions: Generative Language API (veya Don\'t restrict). Ardından backend\'i yeniden başlatın.'
        : undefined,
    });
  }
});

export default router;
