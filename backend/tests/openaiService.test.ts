import { hasHealthConditions, generateTrainingAndNutritionPlan } from '../src/services/openaiService';

// Mock OpenAI module
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mocked training and nutrition plan' } }]
          })
        }
      }
    }))
  };
});

describe('OpenAI Service Tests', () => {
  test('should detect health conditions correctly', async () => {
    const contextWithIssues = { health_conditions: 'diabetes' };
    const hasIssues = await hasHealthConditions(contextWithIssues);
    expect(hasIssues).toBe(true);

    const contextWithoutIssues = { health_conditions: 'nenhuma' };
    const noIssues = await hasHealthConditions(contextWithoutIssues);
    expect(noIssues).toBe(false);
  });

  test('should generate a plan for healthy client', async () => {
    const context = {
      name: 'Test User',
      age: '30',
      gender: 'masculino',
      height: '180',
      weight: '75',
      goal: 'ganhar massa',
      health_conditions: 'nenhuma'
    };
    const plan = await generateTrainingAndNutritionPlan(context);
    expect(plan).toBeDefined();
    expect(typeof plan).toBe('string');
    expect(plan.length).toBeGreaterThan(0);
  });
}); 