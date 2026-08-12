// Proxy para OpenRouter — a chave fica em variável de ambiente no Netlify,
// nunca no bundle do cliente.
export default async (req) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const apiKey = Netlify.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY não configurada no Netlify' }), { status: 500 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
    }

    // Só repassa os campos esperados — impede uso do proxy como gateway aberto
    const payload = {
        model: 'anthropic/claude-3.5-haiku',
        messages: Array.isArray(body.messages) ? body.messages.slice(-30) : [],
        temperature: 0.7
    };

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://minhamerreca.com.br',
            'X-Title': 'Minha Merreca'
        },
        body: JSON.stringify(payload)
    });

    const data = await upstream.text();
    return new Response(data, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const config = { path: '/api/chat' };
