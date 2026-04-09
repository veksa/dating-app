/// <reference types="jest" />

// Global setup to mock database models before any imports
jest.mock('./src/database/models/user.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('./src/database/models/conversation.model', () => ({
  Conversation: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('./src/database/models/conversationMember.model', () => ({
  ConversationMember: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('./src/database/models/message.model', () => ({
  Message: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('./src/database/models/story.model', () => ({
  Story: {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  connection: {
    db: {
      command: jest.fn(),
    },
  },
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => ({
      toString: () => id || '507f1f77bcf86cd799439011',
    })),
  },
}));
