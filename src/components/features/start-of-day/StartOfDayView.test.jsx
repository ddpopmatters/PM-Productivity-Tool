import { render, screen, waitFor, within } from '@testing-library/react';
import StartOfDayView from './StartOfDayView';
import {
  createStartOfDayAgentRun,
  fetchLatestStartOfDayPacket,
  openStartOfDayLocalFile,
  updateStartOfDayPacketStatus,
} from '../../../services/startOfDay';

vi.mock('../../../services/startOfDay', () => ({
  createStartOfDayAgentRun: vi.fn(),
  fetchLatestStartOfDayPacket: vi.fn(),
  groupStartOfDayItems: vi.fn((items = []) => {
    const groups = {
      forgotten_work: [],
      created_file: [],
      agent_can_do: [],
      waiting_on_user: [],
      already_started: [],
    };
    for (const item of items) groups[item.itemType]?.push(item);
    return groups;
  }),
  openStartOfDayLocalFile: vi.fn(),
  updateStartOfDayPacketStatus: vi.fn(),
}));

vi.mock('../../../utils/telegramMiniApp', () => ({
  configureTelegramMiniApp: vi.fn(),
  isTelegramMiniApp: vi.fn(() => false),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function packetWithItems(items) {
  return {
    id: 'packet-1',
    userEmail: 'dan@example.org',
    packetDate: '2026-06-16',
    primaryTask: 'Open the morning packet',
    ifYouFinishEarly: 'Let Hermes clear one safe item.',
    reEntryPrompt: 'Return to the morning packet.',
    ackStatus: 'unseen',
    generatedAt: '2026-06-16T08:00:00Z',
    items,
  };
}

describe('StartOfDayView action buttons', () => {
  it('shows assignment and file actions for actionable packet items', async () => {
    fetchLatestStartOfDayPacket.mockResolvedValue(packetWithItems([
      {
        id: 'agent-item',
        itemType: 'agent_can_do',
        title: 'Draft supporter update',
        summary: 'Hermes can prepare the first pass without Dan.',
        status: 'open',
        nextAction: 'Ask Hermes to draft this.',
      },
      {
        id: 'file-item',
        itemType: 'created_file',
        title: 'Trustee briefing',
        status: 'open',
        localPath: '/Users/dan/dev/population_matters/reports/trustee-brief.md',
      },
      {
        id: 'waiting-item',
        itemType: 'waiting_on_user',
        title: 'Approve the framing',
        status: 'open',
      },
    ]));

    render(<StartOfDayView userEmail="dan@example.org" authUserId="auth-user-1" />);

    const agentSection = await screen.findByRole('heading', { name: 'Hermes Can Do Without You' });
    const agentCard = agentSection.closest('section');
    expect(within(agentCard).getByRole('button', { name: /assign hermes/i })).toBeInTheDocument();

    const fileSection = screen.getByRole('heading', { name: 'Files Created Since Last Packet' }).closest('section');
    expect(within(fileSection).getByRole('button', { name: /open file/i })).toBeInTheDocument();

    const waitingSection = screen.getByRole('heading', { name: 'Waiting On You' }).closest('section');
    expect(within(waitingSection).queryByRole('button', { name: /assign hermes/i })).not.toBeInTheDocument();

    await waitFor(() => expect(fetchLatestStartOfDayPacket).toHaveBeenCalledWith('dan@example.org'));
    expect(createStartOfDayAgentRun).not.toHaveBeenCalled();
    expect(openStartOfDayLocalFile).not.toHaveBeenCalled();
    expect(updateStartOfDayPacketStatus).not.toHaveBeenCalled();
  });
});
