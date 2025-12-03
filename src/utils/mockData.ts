// Simple mock data export for backend API

interface MockData {
  schools: any[];
  classes: any[];
  subjects: any[];
  students: any[];
}

export const mockData: MockData = {
  schools: [],
  classes: [],
  subjects: [],
  students: []
};

// For now, backend will return empty arrays
// Frontend still has all the mock data it needs
