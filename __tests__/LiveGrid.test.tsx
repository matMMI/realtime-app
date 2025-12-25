import { render, screen, waitFor } from "@testing-library/react";
import LiveGrid from "../components/LiveGrid";
import { supabase } from "@/lib/supabase";

// Mock the module inline to avoid hoisting references
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
    getChannels: jest.fn().mockReturnValue([]),
  },
}));

describe("LiveGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [] }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });

    const mockOn = jest.fn().mockReturnThis();
    const mockSubscribe = jest.fn();
    const mockTrack = jest.fn();

    (supabase.channel as jest.Mock).mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
      track: mockTrack,
      presenceState: jest.fn().mockReturnValue({}),
      send: jest.fn(),
    });
  });

  it("renders the grid and title", async () => {
    render(<LiveGrid />);

    // Wait for async useEffect to complete
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalled();
    });

    expect(screen.getByText(/LiveGrid/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("A1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("C3")).toBeInTheDocument();
  });

  it("subscribes to realtime channel on mount", async () => {
    render(<LiveGrid />);

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith(
        "room1",
        expect.any(Object)
      );
    });
  });
});
