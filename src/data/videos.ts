/**
 * Video's voor de handleiding/tutorials pagina.
 * Vul voor elke video een YouTube video-ID in (uit de URL: youtube.com/watch?v=VIDEO_ID)
 * of gebruik type: 'html5' met src: '/videos/naam.mp4' voor zelf gehoste video's.
 */
export type VideoSource = 
  | { type: 'youtube'; videoId: string }
  | { type: 'vimeo'; videoId: string }
  | { type: 'html5'; src: string }

export interface VideoItem {
  id: string
  title: string
  description?: string
  duration: string // bijv. "3:00"
  source: VideoSource
}

export const VIDEOS: VideoItem[] = [
  { id: '1', title: 'Video 1', description: 'Handleiding deel 1', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '2', title: 'Video 2', description: 'Handleiding deel 2', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '3', title: 'Video 3', description: 'Handleiding deel 3', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '4', title: 'Video 4', description: 'Handleiding deel 4', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '5', title: 'Video 5', description: 'Handleiding deel 5', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '6', title: 'Video 6', description: 'Handleiding deel 6', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '7', title: 'Video 7', description: 'Handleiding deel 7', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '8', title: 'Video 8', description: 'Handleiding deel 8', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '9', title: 'Video 9', description: 'Handleiding deel 9', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '10', title: 'Video 10', description: 'Handleiding deel 10', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '11', title: 'Video 11', description: 'Handleiding deel 11', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '12', title: 'Video 12', description: 'Handleiding deel 12', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '13', title: 'Video 13', description: 'Handleiding deel 13', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '14', title: 'Video 14', description: 'Handleiding deel 14', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '15', title: 'Video 15', description: 'Handleiding deel 15', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '16', title: 'Video 16', description: 'Handleiding deel 16', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '17', title: 'Video 17', description: 'Handleiding deel 17', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '18', title: 'Video 18', description: 'Handleiding deel 18', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '19', title: 'Video 19', description: 'Handleiding deel 19', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '20', title: 'Video 20', description: 'Handleiding deel 20', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '21', title: 'Video 21', description: 'Handleiding deel 21', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '22', title: 'Video 22', description: 'Handleiding deel 22', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '23', title: 'Video 23', description: 'Handleiding deel 23', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '24', title: 'Video 24', description: 'Handleiding deel 24', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '25', title: 'Video 25', description: 'Handleiding deel 25', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '26', title: 'Video 26', description: 'Handleiding deel 26', duration: '3:00', source: { type: 'youtube', videoId: '' } },
  { id: '27', title: 'Video 27', description: 'Handleiding deel 27', duration: '3:00', source: { type: 'youtube', videoId: '' } },
]
