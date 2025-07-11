import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import React from 'react';
import AdminAIChat from '../src/components/AdminAIChat';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import '@testing-library/jest-dom';

vi.mock('../src/services/api', () => ({
  dashboardAPI: {
    getAdminConversations: vi.fn(() => Promise.resolve({ conversations: [{ id: '1', title: 'Test Conversation', created_at: new Date().toISOString() }] })),
    getAdminChatHistory: vi.fn(() => Promise.resolve({ history: [] })),
    chatWithAI: vi.fn(() => Promise.resolve({ message: 'Resposta da IA' })),
    createAdminConversation: vi.fn(() => Promise.resolve({ conversationId: '1' })),
  },
}));

describe('AdminAIChat Component', () => {
  const renderComponent = () => {
    return render(
      <AuthProvider>
        <ThemeProvider>
          <AdminAIChat />
        </ThemeProvider>
      </AuthProvider>
    );
  };

  test('renders initial no conversation state', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Chat com IA Admin')).toBeInTheDocument();
      expect(screen.getByText('Selecione uma conversa ou crie uma nova para começar')).toBeInTheDocument();
    });
  });

  test('creates new conversation and renders chat interface', async () => {
    renderComponent();
    
    // Wait for component to load and conversations to appear
    await waitFor(() => {
      expect(screen.getAllByText('Test Conversation')).toHaveLength(2);
    });

    // Click on the conversation item container (the div with group class)
    const conversationContainers = screen.getAllByText('Test Conversation');
    const conversationContainer = conversationContainers[0].closest('.group');
    
    await act(async () => {
      fireEvent.click(conversationContainer!);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escreva a sua mensagem...')).toBeInTheDocument();
    });
  });

  test('sends message and displays response', async () => {
    renderComponent();
    
    // Wait for component to load and conversations to appear
    await waitFor(() => {
      expect(screen.getAllByText('Test Conversation')).toHaveLength(2);
    });

    // Click on the conversation item container
    const conversationContainers = screen.getAllByText('Test Conversation');
    const conversationContainer = conversationContainers[0].closest('.group');
    
    await act(async () => {
      fireEvent.click(conversationContainer!);
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Escreva a sua mensagem...');
      const sendButton = screen.getByRole('button', { name: /enviar/i });

      act(() => {
        fireEvent.change(input, { target: { value: 'Olá IA' } });
        fireEvent.click(sendButton);
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Resposta da IA')).toBeInTheDocument();
    });
  });
}); 