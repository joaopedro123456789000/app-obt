# EcoPonto BR - Plataforma Inteligente de Coleta Seletiva

## 🌱 Sobre o Projeto

**EcoPonto BR** é uma aplicação mobile profissional que transforma reciclagem em impacto ambiental real. Desenvolvida para a OBT 2026, resolve um problema crítico: apenas 3% do lixo é reciclado no Brasil (IBGE 2024).

### Alinhamento ODS da ONU
- **ODS 11**: Cidades e Comunidades Sustentáveis
- **ODS 13**: Ação Contra a Mudança Global do Clima

## 🚀 Funcionalidades Principais

### 1. **Autenticação Google (Emergent)**
- Login social via Google OAuth
- Sistema de sessões seguro
- Perfis de usuário, escola e admin

### 2. **Mapa Interativo de Pontos de Coleta**
- Visualização em tempo real com OpenStreetMap
- Filtros por tipo de material (plástico, papel, vidro, metal, eletrônico, orgânico)
- Cálculo de distância e rotas
- Geolocalização do usuário
- Marcadores customizados por capacidade e tipo

### 3. **Registro de Entregas com IA**
- **Câmera integrada** para captura de fotos
- **IA de Classificação Automática** usando Gemini Vision (Emergent LLM Key)
- Calcula pontos baseado em tipo e peso
- **Cálculo de Impacto Ambiental**: CO₂ economizado
- Histórico completo de entregas
- Certificados digitais

### 4. **Feed de Notícias Ambientais Reais**
- **Fontes oficiais do governo brasileiro**:
  - IBAMA (fiscalização ambiental)
  - INPE (desmatamento, queimadas)
  - MMA (Ministério do Meio Ambiente)
  - Agência Brasil (notícias ambientais)
- Categorização automática (desmatamento, reciclagem, clima, fauna)
- Atualização automática via RSS
- Filtros por categoria
- Links diretos para notícias completas

### 5. **Sistema de Gamificação**
- **Pontos**: Ganhe por kg entregue (multiplicador por tipo de material)
- **Níveis**: Progressão automática (level up a cada 1000 pontos)
- **Rankings**: Global, por cidade, por escola
- **Desafios**: Diários e semanais com recompensas
- **Impacto Visual**: Árvores plantadas, CO₂ evitado

### 6. **Parcerias com Escolas**
- Escolas podem se cadastrar como pontos de coleta
- Dashboard com estatísticas (kg coletados, ranking de turmas)
- Sistema de selos verdes e prêmios
- Validação por CNPJ ou email MEC

### 7. **Dashboards e Relatórios**
- **Usuário**: Pontos, kg reciclados, CO₂ economizado, nível
- **Escola**: Estatísticas detalhadas, ranking entre turmas
- **Admin**: Visão geral do sistema (total de usuários, entregas, impacto global)

## 🛠️ Stack Tecnológica

### Frontend (React Native + Expo)
- **Framework**: Expo SDK 54
- **Navegação**: Expo Router (file-based routing)
- **Mapas**: react-native-maps (OpenStreetMap)
- **Câmera**: expo-camera
- **Localização**: expo-location
- **State Management**: Zustand
- **HTTP Client**: Axios
- **UI**: React Native components + custom design system

### Backend (FastAPI + Python)
- **Framework**: FastAPI
- **Database**: MongoDB (Motor async driver)
- **Auth**: Emergent Google OAuth
- **IA**: Gemini Vision via Emergent LLM Key
- **RSS Parser**: feedparser (notícias reais)
- **Async**: asyncio para tasks em background

### Integrações
- **Emergent LLM Key**: Acesso a Gemini Vision para classificação de imagens
- **Emergent Google Auth**: Sistema de autenticação social
- **RSS Feeds Governamentais**: 
  - https://www.gov.br/ibama/pt-br/assuntos/noticias/rss.xml
  - https://www.inpe.br/noticias/rss.php
  - https://www.gov.br/mma/pt-br/central-de-conteudos/rss
  - https://agenciabrasil.ebc.com.br/rss/meio-ambiente

## 📊 Modelos de Dados

### Users
- user_id, email, name, picture
- points, level, total_kg_collected, total_co2_saved
- role (user/school/admin), city, state

### Collection Points
- point_id, name, latitude, longitude, address
- types_accepted[], capacity_percentage
- is_school, school_id, hours

### Deliveries
- delivery_id, user_id, point_id
- waste_type, weight_kg, photo_base64
- points_earned, co2_saved_kg, confidence
- created_at

### News
- article_id, title, description, url
- source, category, published_at
- cached_at (atualização a cada 6h)

### Rankings
- Calculados dinamicamente por pontos
- Filtros: global, por cidade, por escola

### Challenges
- challenge_id, title, description
- goal, reward_points
- start_date, end_date, active

## 🎨 Design System

### Cores
- **Primary Green**: #10B981 (sustentabilidade)
- **Dark Green**: #065F46
- **Light Green**: #ECFDF5
- **Accent Orange**: #F59E0B (escolas)
- **Blue**: #3B82F6 (plástico)
- **Gray Scale**: #111827, #6B7280, #9CA3AF, #F9FAFB

### Tipografia
- **Títulos**: Bold, 18-36px
- **Corpo**: Regular/Medium, 14-16px
- **Labels**: 12px

### Componentes
- Cards com shadow elevation
- Botões arredondados (borderRadius: 12)
- Ícones: Ionicons
- Spacing: 8pt grid

## 🔐 Autenticação

### Fluxo OAuth (Emergent)
1. Usuário clica em "Entrar com Google"
2. Redirecionamento para Emergent Auth
3. Callback processa session_id
4. Cria/atualiza usuário no MongoDB
5. Estabelece sessão (cookie + token)
6. Redirecionamento para app autenticado

## 🧪 Endpoints da API

### Auth
- `GET /api/auth/google-login` - Inicia OAuth
- `GET /api/auth/callback` - Processa callback
- `GET /api/auth/me` - Retorna usuário autenticado
- `POST /api/auth/logout` - Encerra sessão

### Collection Points
- `GET /api/collection-points` - Lista pontos (filtros: waste_type, city, lat/lng)
- `POST /api/collection-points` - Cria ponto (admin/escola)

### Deliveries
- `POST /api/deliveries` - Registra entrega (+ IA classifica)
- `GET /api/deliveries` - Lista entregas do usuário
- `GET /api/deliveries/:id` - Detalhes (com foto)

### News
- `GET /api/news` - Feed de notícias (cache 6h)
- `POST /api/news/refresh` - Força atualização

### Rankings
- `GET /api/rankings/global` - Ranking global
- `GET /api/rankings/city/:city` - Ranking por cidade

### Challenges
- `GET /api/challenges` - Lista desafios ativos

### Admin
- `GET /api/admin/stats` - Estatísticas gerais

## 📱 Telas do App

1. **Login** - Google OAuth
2. **Home/Map** - Mapa com pontos de coleta
3. **Deliveries** - Lista de entregas + FAB para nova entrega
4. **Deliver** - Câmera + formulário + IA
5. **News** - Feed de notícias com filtros
6. **Ranking** - Leaderboards (global/cidade)
7. **Profile** - Dados do usuário, estatísticas, impacto

## 🌍 Impacto Ambiental

### Cálculos de CO₂ (por kg reciclado)
- Plástico: 1.5 kg CO₂
- Papel: 0.8 kg CO₂
- Vidro: 0.3 kg CO₂
- Metal: 2.0 kg CO₂
- Eletrônico: 3.0 kg CO₂
- Orgânico: 0.2 kg CO₂

### Sistema de Pontos
- Plástico: 10 pts/kg
- Papel: 8 pts/kg
- Vidro: 12 pts/kg
- Metal: 15 pts/kg
- Eletrônico: 20 pts/kg
- Orgânico: 5 pts/kg

## 🚀 Como Executar

### Backend
```bash
cd /app/backend
source ../.venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd /app/frontend
yarn install
yarn start
```

### Variáveis de Ambiente

**Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EMERGENT_LLM_KEY=sk-emergent-c161dD00664D4C02e7
```

**Frontend (.env)**
```
EXPO_PUBLIC_BACKEND_URL=https://your-app.preview.emergentagent.com
```

## 📝 Próximas Funcionalidades

- [ ] Integração com empresas de logística
- [ ] Sistema de vouchers e prêmios reais
- [ ] Reconhecimento de imagem offline
- [ ] Modo escuro
- [ ] Notificações push para desafios
- [ ] Exportação de relatórios em PDF
- [ ] Integração com escolas via API MEC
- [ ] Sistema de badges e conquistas expandido

## 🏆 Diferenciais para OBT 2026

1. **Dados Reais**: Notícias de fontes oficiais brasileiras
2. **IA Funcional**: Classificação automática com Gemini Vision
3. **Impacto Mensurável**: CO₂ economizado, kg reciclados
4. **Parcerias Educacionais**: Escolas como hubs de reciclagem
5. **Gratuito e Escalável**: 100% ferramentas gratuitas
6. **UX Profissional**: Design system consistente
7. **Mobile-First**: Otimizado para smartphones
8. **Gamificação Real**: Pontos, níveis, rankings, desafios

## 📄 Licença

MIT License - Desenvolvido para OBT 2026

---

**EcoPonto BR** - Transformando reciclagem em impacto ambiental 🌱🇧🇷
