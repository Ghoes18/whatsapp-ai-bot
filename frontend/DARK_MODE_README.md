# Dark Mode Implementation

Este projeto agora possui suporte completo ao dark mode! Aqui está como funciona e como usar:

## 🎨 Como Funciona

### 1. Contexto de Tema
O dark mode é gerenciado através do `ThemeContext` localizado em `src/contexts/ThemeContext.tsx`. Este contexto:
- Detecta automaticamente a preferência do sistema
- Salva a preferência no localStorage
- Escuta mudanças na preferência do sistema
- Fornece funções para alternar e definir o tema

### 2. Configuração do Tailwind
O Tailwind CSS está configurado para usar `darkMode: 'class'`, o que significa que o dark mode é ativado adicionando a classe `dark` ao elemento `html`.

### 3. Hook Personalizado
Use o hook `useTheme()` para acessar as funções do tema:

```tsx
import { useTheme } from '../contexts/ThemeContext';

const MyComponent = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};
```

## 🎯 Como Usar

### Classes CSS para Dark Mode

Use as classes `dark:` do Tailwind para estilos específicos do dark mode:

```tsx
// Exemplo de componente com dark mode
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  <h1 className="text-gray-900 dark:text-gray-100">Título</h1>
  <p className="text-gray-600 dark:text-gray-400">Texto</p>
</div>
```

### Padrões Comuns

#### Cores de Fundo
- `bg-white dark:bg-gray-800` - Fundo principal
- `bg-gray-50 dark:bg-gray-900` - Fundo secundário
- `bg-gray-100 dark:bg-gray-700` - Fundo de cards/elementos

#### Cores de Texto
- `text-gray-900 dark:text-gray-100` - Texto principal
- `text-gray-600 dark:text-gray-400` - Texto secundário
- `text-gray-500 dark:text-gray-500` - Texto terciário

#### Bordas
- `border-gray-200 dark:border-gray-700` - Bordas principais
- `border-gray-300 dark:border-gray-600` - Bordas de inputs

#### Estados Hover
- `hover:bg-gray-50 dark:hover:bg-gray-700` - Hover em elementos
- `hover:text-gray-900 dark:hover:text-gray-100` - Hover em texto

### Componentes Atualizados

Os seguintes componentes já foram atualizados para suportar dark mode:
- ✅ `App.tsx` - Container principal
- ✅ `Sidebar.tsx` - Barra lateral com botão de toggle
- ✅ `Dashboard.tsx` - Dashboard principal
- ✅ `Conversations.tsx` - Lista de conversas e chat
- ✅ `AdminAIChat.tsx` - Chat com IA do admin
- ✅ `PendingPlans.tsx` - Planos pendentes (parcialmente)
- ✅ `HumanSupportRequests.tsx` - Solicitações de suporte humano
- ⏳ Outros componentes (podem precisar de atualização completa)

## 🔧 Implementação em Novos Componentes

### 1. Importar o Hook
```tsx
import { useTheme } from '../contexts/ThemeContext';
```

### 2. Usar Classes Dark
```tsx
const MyComponent = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Meu Componente
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Descrição do componente
      </p>
    </div>
  );
};
```

### 3. Botão de Toggle (Opcional)
```tsx
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};
```

## 🎨 Classes CSS Utilitárias

O arquivo `src/index.css` contém classes utilitárias que já suportam dark mode:

### Botões
```css
.btn-primary /* Suporte completo ao dark mode */
.btn-secondary /* Suporte completo ao dark mode */
```

### Cards e Inputs
```css
.card /* Suporte completo ao dark mode */
.input-field /* Suporte completo ao dark mode */
```

## 🌟 Recursos Avançados

### Transições Suaves
Todas as mudanças de tema incluem transições suaves:
```css
transition-colors duration-200
```

### Detecção Automática
O sistema detecta automaticamente a preferência do sistema operacional e aplica o tema correspondente.

### Persistência
A preferência do usuário é salva no localStorage e mantida entre sessões.

## 🚀 Próximos Passos

Para completar a implementação do dark mode:

1. Atualizar os componentes restantes:
   - `ClientProfile.tsx` (componente grande, precisa de atualização completa)
   - `PlanViewModal.tsx` (pendente)
   - Finalizar `PendingPlans.tsx` (modal e outros elementos)

2. Testar em diferentes navegadores e dispositivos

3. Considerar adicionar animações de transição mais elaboradas

4. Implementar testes para garantir que o dark mode funciona corretamente

5. Verificar se todos os modais e overlays estão com dark mode

## 📝 Notas

- O dark mode é ativado adicionando a classe `dark` ao elemento `html`
- Todas as transições são suaves e duram 200ms
- O sistema respeita a preferência do usuário e do sistema operacional
- A implementação é totalmente responsiva e funciona em todos os tamanhos de tela 