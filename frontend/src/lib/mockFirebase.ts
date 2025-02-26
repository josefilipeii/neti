export const mockHyroxCategories = [
  { id: '1', name: 'Pro Men' },
  { id: '2', name: 'Pro Women' },
  { id: '3', name: "Men's Doubles" },
  { id: '4', name: "Women's Doubles" },
  { id: '5', name: 'Mixed Doubles' },
  { id: '6', name: 'Open Men' },
  { id: '7', name: 'Open Women' },
  { id: '8', name: 'Relay Teams' },
];

// Mock Firebase data store
const participants = new Map<
  string,
  {
    id: string;
    name: string;
    email: string;
    category: string;
    partnerName?: string;
    teamName?: string;
    createdAt: Date;
  }
>();

// Add some mock data
participants.set('QR001', {
  id: 'QR001',
  name: 'John Doe',
  email: 'john@example.com',
  category: 'individual-male',
  createdAt: new Date(),
});

participants.set('QR002', {
  id: 'QR002',
  name: 'Jane Smith',
  email: 'jane@example.com',
  category: 'Open Women',
  createdAt: new Date(),
});

participants.set('QR003', {
  id: 'QR003',
  name: 'Mike Johnson',
  email: 'mike@example.com',
  category: 'mixed-pairs',
  partnerName: 'Sarah Wilson',
  createdAt: new Date(),
});

const checkIns = new Map<
  string,
  {
    id: string;
    participantId: string;
    checkedInAt: Date;
    checkedInBy: string;
  }
>();

export const mockFirebase = {
  async listCategories() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockHyroxCategories;
  },

  async getParticipant(id: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return participants.get(id);
  },

  async getByEmail(email: string, category?: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const participant = Array.from(participants.values()).find((v) => {
      const emailMatch = v.email === email;
      if (category) {
        return emailMatch && v.category === category;
      }
      return emailMatch;
    });
    return participant;
  },

  async checkIn(participantId: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const checkInId = `checkin_${Date.now()}`;
    const checkIn = {
      id: checkInId,
      participantId,
      checkedInAt: new Date(),
      checkedInBy: 'mock-operator-id',
    };
    checkIns.set(checkInId, checkIn);
    return checkIn;
  },

  async getCheckIns() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return Array.from(checkIns.values());
  },

  async getParticipants() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return Array.from(participants.values());
  },
};
