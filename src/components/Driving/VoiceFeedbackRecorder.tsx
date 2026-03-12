import { useState, useRef } from 'react';
import { Mic, Square, Send } from 'lucide-react';

type VoiceFeedbackRecorderProps = {
  onSubmit: (audioBlob: Blob, transcript: string) => void;
};

export function VoiceFeedbackRecorder({ onSubmit }: VoiceFeedbackRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = () => {
    if (recordedAudio) {
      onSubmit(recordedAudio, transcript);
      setRecordedAudio(null);
      setTranscript('');
    }
  };

  const handleRecordAgain = () => {
    setRecordedAudio(null);
    setTranscript('');
  };

  if (!recordedAudio) {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center justify-center w-20 h-20 rounded-full transition-all transform hover:scale-105 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/50'
          }`}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-white fill-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
        <p className="text-sm text-gray-400">
          {isRecording ? 'Recording... Tap to stop' : 'Tap to record feedback'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-300 mb-2">
          Add text description (optional)
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none transition-all placeholder-gray-500"
          placeholder="Express yourself more clearly... (optional)"
          rows={3}
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleRecordAgain}
          className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          Record Again
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
          Submit Feedback
        </button>
      </div>
    </div>
  );
}
