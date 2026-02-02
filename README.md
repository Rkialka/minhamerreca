# Minha Merreca

Este é um aplicativo de controle financeiro pessoal chamado **Minha Merreca**.

## Funcionalidades
- **Gestão de Lançamentos:** Registro de receitas e despesas com suporte a pagamentos à vista, fixos e parcelados.
- **Categorias Personalizadas:** Gerenciamento completo de categorias com ícones e cores customizáveis.
- **Relatórios Detalhados:** Visualização anual discriminada por categoria para melhor análise de gastos.
- **Merreca Chat:** Assistente financeiro integrado com IA (OpenAI GPT-4o-mini) para análise de documentos e lançamentos automáticos.
- **Sincronização em Tempo Real:** Utiliza Firebase Firestore para persistência de dados.

## Estrutura do Projeto
- `src/App.jsx`: Componente principal contendo toda a lógica da interface e estados do React.
- `src/firebaseConfig.js`: Configurações de conexão com o banco de dados Firebase.
- `src/index.css`: Estilização global utilizando Tailwind CSS.

## Comandos Disponíveis
- `npm run dev`: Inicia o servidor de desenvolvimento.
- `npm run build`: Gera o bundle de produção.
- `npm run preview`: Visualiza o build de produção localmente.

## Histórico de Restauração
Em 02/02/2026, foi realizada uma restauração completa do sistema para recuperar funcionalidades de interface que haviam sido removidas acidentalmente, incluindo a tela de categorias e o detalhamento de relatórios.
