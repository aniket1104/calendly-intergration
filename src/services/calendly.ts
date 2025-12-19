import axios from 'axios';
import { CONFIG } from '../config';
import { addDays, format, startOfDay, addMinutes } from 'date-fns';

export interface EventType {
  uri: string;
  name: string;
  duration: number;
  slug: string;
}

export interface TimeSlot {
  startTime: string; // ISO string
  endTime: string;   // ISO string
  status: 'available' | 'busy';
}

export interface BookingRequest {
  eventTypeId: string;
  startTime: string;
  name: string;
  email: string;
  reason: string;
}

export class CalendlyService {
  private apiBase = CONFIG.CALENDLY_API_BASE;
  private token = CONFIG.CALENDLY_TOKEN;

  constructor() {}

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getCurrentUser() {
    if (CONFIG.MOCK_MODE) {
      return {
        resource: {
          uri: 'urn:calendly:user:MOCK_USER_123',
          name: 'Dr. Mock',
          slug: 'dr-mock',
          email: 'doctor@clinic.com',
          scheduling_url: 'https://calendly.com/dr-mock'
        }
      };
    }
    
    const response = await axios.get(`${this.apiBase}/users/me`, { headers: this.headers });
    return response.data;
  }

  async getEventTypes(): Promise<EventType[]> {
    if (CONFIG.MOCK_MODE) {
      return [
        { uri: 'urn:calendly:event_type:1', name: 'General Consultation', duration: 30, slug: 'general-30' },
        { uri: 'urn:calendly:event_type:2', name: 'Follow-up', duration: 15, slug: 'followup-15' },
        { uri: 'urn:calendly:event_type:3', name: 'Physical Exam', duration: 45, slug: 'physical-45' },
        { uri: 'urn:calendly:event_type:4', name: 'Specialist Consultation', duration: 60, slug: 'specialist-60' }
      ];
    }

    const user = await this.getCurrentUser();
    const response = await axios.get(`${this.apiBase}/event_types?user=${user.resource.uri}`, { headers: this.headers });
    return response.data.collection.map((et: any) => ({
      uri: et.uri,
      name: et.name,
      duration: et.duration,
      slug: et.slug
    }));
  }

  async getAvailability(dateStr: string, durationMinutes: number): Promise<TimeSlot[]> {
    // dateStr is YYYY-MM-DD
    if (CONFIG.MOCK_MODE) {
      const slots: TimeSlot[] = [];
      const startHour = 9;
      const endHour = 17;
      const date = new Date(dateStr);
      
      for (let h = startHour; h < endHour; h++) {
        const slotStart = new Date(date);
        slotStart.setHours(h, 0, 0, 0);
        const slotEnd = addMinutes(slotStart, durationMinutes);
        const isBusy = Math.random() > 0.7; 
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          status: isBusy ? 'busy' : 'available'
        });
      }
      return slots.filter(s => s.status === 'available');
    }

    try {
      const user = await this.getCurrentUser();
      const startTime = new Date(dateStr);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(dateStr);
      endTime.setHours(23, 59, 59, 999);

      const response = await axios.get(`${this.apiBase}/user_busy_times`, {
        headers: this.headers,
        params: {
          user: user.resource.uri,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        }
      });

      const busyTimes = response.data.collection; // [{ start_time, end_time, type }]

      // Generate slots for 9am-5pm (Default working hours)
      const slots: TimeSlot[] = [];
      const workStart = new Date(dateStr);
      workStart.setHours(9, 0, 0, 0);
      const workEnd = new Date(dateStr);
      workEnd.setHours(17, 0, 0, 0);

      let current = workStart;
      while (addMinutes(current, durationMinutes) <= workEnd) {
        const slotEnd = addMinutes(current, durationMinutes);
        
        // Check overlap
        const isBusy = busyTimes.some((busy: any) => {
          const busyStart = new Date(busy.start_time);
          const busyEnd = new Date(busy.end_time);
          return (current < busyEnd && slotEnd > busyStart);
        });

        if (!isBusy) {
          slots.push({
            startTime: current.toISOString(),
            endTime: slotEnd.toISOString(),
            status: 'available'
          });
        }
        
        // Increment by duration (or 30 mins for standard blocks)
        current = addMinutes(current, 30); 
      }

      return slots;
    } catch (error) {
      console.error("Error fetching availability:", error);
      return [];
    }
  }

  async createAppointment(booking: BookingRequest): Promise<any> {
    if (CONFIG.MOCK_MODE) {
      return {
        resource: {
          uri: `urn:calendly:scheduled_event:${Math.random().toString(36).substr(2, 9)}`,
          name: booking.name,
          status: 'active',
          start_time: booking.startTime,
          location: { type: 'physical', location: 'Clinic Room 1' }
        }
      };
    }

    // Generate a Single-Use Scheduling Link.
    const user = await this.getCurrentUser();
    const response = await axios.post(`${this.apiBase}/scheduling_links`, {
      max_event_count: 1,
      owner: user.resource.uri,
      owner_type: 'User'
    }, { headers: this.headers });
    
    return {
      confirmation_method: 'link',
      booking_url: response.data.resource.booking_url
    };
  }
}
