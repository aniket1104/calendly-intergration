import { SessionManager, SessionState, UserSession, sessionManager } from './sessionManager';
import { CalendlyService, EventType } from '../services/calendly';
import { TimeUtils } from '../utils/timeUtils';
import { format } from 'date-fns';

const calendlyService = new CalendlyService();

export class WorkflowEngine {
  async processMessage(sessionId: string, message: string): Promise<string> {
    let session = sessionManager.getSession(sessionId);
    if (!session) {
      session = sessionManager.createSession(sessionId);
      // If it's a new session, we ignore the message (or treat it as a trigger) and start fresh
      // But usually we want to respond to the first "Hi".
      // Let's just initialize and return the greeting immediately if it's new.
      sessionManager.updateSession(session.id, { state: SessionState.AWAITING_REASON });
      return "Hello! I'm your AI appointment assistant. How can I help you today? (e.g., 'I need a general consultation')";
    }

    switch (session.state) {
      case SessionState.AWAITING_REASON:
        return this.handleReason(session, message);
      case SessionState.AWAITING_DATE:
        return this.handleDate(session, message);
      case SessionState.SELECTING_SLOT:
        return this.handleSlotSelection(session, message);
      case SessionState.AWAITING_NAME:
        return this.handleName(session, message);
      case SessionState.AWAITING_EMAIL:
        return this.handleEmail(session, message);
      case SessionState.AWAITING_CONFIRMATION:
        return this.handleConfirmation(session, message);
      case SessionState.COMPLETED:
        return "You already have a booking. Start a new chat to book another.";
      default:
        return "I'm not sure what to do. Let's start over.";
    }
  }

  private async handleReason(session: UserSession, message: string): Promise<string> {
    const lower = message.toLowerCase();
    const eventTypes = await calendlyService.getEventTypes();
    
    let selectedType: EventType | undefined;

    if (lower.includes('follow') || lower.includes('follow-up')) {
      selectedType = eventTypes.find(e => e.slug.includes('follow'));
    } else if (lower.includes('physical') || lower.includes('exam')) {
      selectedType = eventTypes.find(e => e.slug.includes('physical'));
    } else if (lower.includes('specialist')) {
      selectedType = eventTypes.find(e => e.slug.includes('specialist'));
    } else {
      selectedType = eventTypes.find(e => e.slug.includes('general'));
    }

    if (!selectedType) {
      return "I couldn't determine the appointment type. We offer: General Consultation, Follow-up, Physical Exam, and Specialist Consultation. Which one would you like?";
    }

    sessionManager.updateSession(session.id, { 
      state: SessionState.AWAITING_DATE,
      data: { ...session.data, appointmentType: selectedType }
    });

    return `Okay, a ${selectedType.name} (${selectedType.duration} mins). When would you like to come in? (e.g., 'Tomorrow morning', 'Next Monday')`;
  }

  private async handleDate(session: UserSession, message: string): Promise<string> {
    const date = TimeUtils.parseDate(message);
    const timeRange = TimeUtils.parseVagueTime(message);

    if (!date) {
      return "I didn't catch the date. Please say something like 'Tomorrow', 'Monday', or a specific date.";
    }

    // Fetch availability
    const duration = session.data.appointmentType.duration;
    const slots = await calendlyService.getAvailability(format(date, 'yyyy-MM-dd'), duration);

    if (slots.length === 0) {
      return "I'm sorry, I don't see any openings for that day. Could you try another date?";
    }

    // Filter by time range if provided
    let filteredSlots = slots;
    if (timeRange) {
      filteredSlots = slots.filter(slot => {
        const hour = new Date(slot.startTime).getHours();
        return hour >= timeRange.startHour && hour < timeRange.endHour;
      });
    }

    const suggestions = filteredSlots.slice(0, 3);
    
    if (suggestions.length === 0) {
      return "I have openings that day, but not in that specific time range. Would you like to see other times?";
    }

    sessionManager.updateSession(session.id, {
      state: SessionState.SELECTING_SLOT,
      data: { ...session.data, availableSlots: suggestions, preferredDate: date }
    });

    const slotOptions = suggestions.map((s, i) => `${i + 1}. ${TimeUtils.formatSlot(s.startTime)}`).join('\n');
    return `Here are some available times:\n${slotOptions}\n\nPlease reply with the number (1-3) of the slot you want.`;
  }

  private async handleSlotSelection(session: UserSession, message: string): Promise<string> {
    const index = parseInt(message.trim()) - 1;
    const slots = session.data.availableSlots || [];

    if (isNaN(index) || index < 0 || index >= slots.length) {
      return "Please select a valid number from the list.";
    }

    const selectedSlot = slots[index];
    sessionManager.updateSession(session.id, {
      state: SessionState.AWAITING_NAME,
      data: { ...session.data, selectedSlot }
    });

    return "Great choice. To finalize, may I have your full name?";
  }

  private async handleName(session: UserSession, message: string): Promise<string> {
    sessionManager.updateSession(session.id, {
      state: SessionState.AWAITING_EMAIL,
      data: { ...session.data, name: message }
    });
    return "Thanks. And your email address?";
  }

  private async handleEmail(session: UserSession, message: string): Promise<string> {
    // Basic validation
    if (!message.includes('@')) {
      return "That doesn't look like a valid email. Please try again.";
    }

    sessionManager.updateSession(session.id, {
      state: SessionState.AWAITING_CONFIRMATION,
      data: { ...session.data, email: message }
    });

    const { appointmentType, selectedSlot, name } = session.data;
    const summary = `
Booking Summary:
- Type: ${appointmentType.name}
- Time: ${TimeUtils.formatSlot(selectedSlot.startTime)}
- Patient: ${name}
- Email: ${message}

Should I go ahead and book this? (Yes/No)
    `;
    return summary;
  }

  private async handleConfirmation(session: UserSession, message: string): Promise<string> {
    const lower = message.toLowerCase();
    if (lower.includes('no') || lower.includes('cancel')) {
      sessionManager.updateSession(session.id, { state: SessionState.INIT, data: {} });
      return "Booking cancelled. Let me know if you want to start over.";
    }

    if (lower.includes('yes') || lower.includes('confirm') || lower.includes('ok')) {
      try {
        const result = await calendlyService.createAppointment({
          eventTypeId: session.data.appointmentType.uri,
          startTime: session.data.selectedSlot.startTime,
          name: session.data.name!,
          email: session.data.email!,
          reason: "Booked via AI Agent"
        });

        sessionManager.updateSession(session.id, { state: SessionState.COMPLETED });
        
        if (result.confirmation_method === 'link') {
           return `✅ Appointment Confirmed!\n\nPlease complete your booking here: ${result.booking_url}`;
        }
        
        return `✅ Appointment Confirmed!\n\n📅 Date: ${TimeUtils.formatSlot(session.data.selectedSlot.startTime)}\n🩺 Type: ${session.data.appointmentType.name}\n📍 Location: Clinic Room 1`;
      } catch (error) {
        console.error(error);
        return "There was an error booking your appointment. Please try again later.";
      }
    }

    return "Please confirm with 'Yes' or 'No'.";
  }
}
