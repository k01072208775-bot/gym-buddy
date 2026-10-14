/**
 * DB 스키마 타입.
 *
 * 지금은 supabase/migrations/0001_init.sql 을 보고 손으로 작성한 버전입니다.
 * Supabase 프로젝트를 만든 뒤에는 아래 명령으로 자동 생성해 이 파일을 덮어쓰세요:
 *
 *   npx supabase login
 *   npx supabase gen types typescript --project-id <프로젝트ID> > src/types/database.ts
 *
 * 스키마를 바꿀 때마다 다시 생성하면 쿼리 오타를 타입스크립트가 잡아줍니다.
 */

export type Gender = 'male' | 'female' | 'other';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type SwipeAction = 'like' | 'pass';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type BoardType = 'free' | 'workout' | 'market';
export type TradeStatus = 'selling' | 'reserved' | 'sold';

export type Profile = {
  id: string;
  nickname: string;
  university: string;
  gender: Gender;
  birth_year: number;
  bio: string | null;
  avatar_url: string | null;
  verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutPrefs = {
  user_id: string;
  sports: string[];
  gym_name: string | null;
  time_slots: string[];
  experience: ExperienceLevel;
  goal: string | null;
  prefer_same_university: boolean;
  prefer_gender: Gender[];
  updated_at: string;
};

export type Swipe = {
  id: number;
  from_user: string;
  to_user: string;
  action: SwipeAction;
  created_at: string;
};

export type Match = {
  id: number;
  user_a: string;
  user_b: string;
  created_at: string;
};

export type Message = {
  id: number;
  match_id: number;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Block = {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type Report = {
  id: number;
  reporter_id: string | null;
  target_id: string;
  reason: string;
  detail: string | null;
  status: ReportStatus;
  /** 게시글 / 댓글 신고일 때만 채워짐 (0003_boards.sql) */
  post_id: number | null;
  comment_id: number | null;
  created_at: string;
};

export type Post = {
  id: number;
  board: BoardType;
  /** 운동게시판만. 축구, 풋살 … (0004_post_sport.sql) */
  sport: string | null;
  author_id: string;
  university: string;
  title: string;
  body: string;
  /** 첨부 사진 공개 URL. 최대 4장 (0005_post_images.sql) */
  image_urls: string[];
  /** 장터게시판만. 0 = 나눔 */
  price: number | null;
  trade_status: TradeStatus | null;
  /** 운동게시판 모집글만. 글쓴이를 포함한 총 인원 (0007_post_join.sql) */
  capacity: number | null;
  /** 참여 기록 수. 글쓴이는 여기 포함되지 않습니다 (표시에는 joined_count 를 쓰세요) */
  participant_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
};

export type PostComment = {
  id: number;
  post_id: number;
  author_id: string;
  body: string;
  created_at: string;
};

export type PostLike = {
  post_id: number;
  user_id: string;
  created_at: string;
};

/** get_posts / get_post RPC 가 돌려주는 글 */
export type PostItem = Omit<Post, 'university'> & {
  author_nickname: string;
  liked_by_me: boolean;
  /** 글쓴이를 포함한 현재 인원. 화면에는 이 값을 쓰세요 */
  joined_count: number;
  joined_by_me: boolean;
  is_mine: boolean;
};

/** post_participants 테이블 한 줄 */
export type PostParticipation = {
  post_id: number;
  user_id: string;
  created_at: string;
};

/** get_post_participants RPC 가 돌려주는 참여자 */
export type PostParticipant = {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  joined_at: string;
};

/** get_comments RPC 가 돌려주는 댓글 */
export type CommentItem = PostComment & {
  author_nickname: string;
  is_mine: boolean;
};

/** get_candidates RPC 가 돌려주는 한 명의 후보 */
export type Candidate = {
  id: string;
  nickname: string;
  university: string;
  gender: Gender;
  birth_year: number;
  bio: string | null;
  avatar_url: string | null;
  sports: string[];
  gym_name: string | null;
  time_slots: string[];
  experience: ExperienceLevel;
  shared_sports: number;
  shared_slots: number;
};

/** get_likes_received RPC 가 돌려주는, 나에게 '같이 운동해요'를 보낸 사람 */
export type LikeReceived = Candidate & {
  liked_at: string;
};

type Table<Row, Required extends keyof Row, Generated extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>>;
  Update: Partial<Omit<Row, Generated>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        'id' | 'nickname' | 'university' | 'gender' | 'birth_year',
        'created_at' | 'updated_at'
      >;
      workout_prefs: Table<WorkoutPrefs, 'user_id', 'updated_at'>;
      swipes: Table<Swipe, 'from_user' | 'to_user' | 'action', 'id' | 'created_at'>;
      matches: Table<Match, 'user_a' | 'user_b', 'id' | 'created_at'>;
      messages: Table<Message, 'match_id' | 'sender_id' | 'body', 'id' | 'created_at'>;
      blocks: Table<Block, 'blocker_id' | 'blocked_id', 'created_at'>;
      reports: Table<Report, 'target_id' | 'reason', 'id' | 'created_at' | 'status'>;
      posts: Table<
        Post,
        'board' | 'author_id' | 'title' | 'body',
        'id' | 'university' | 'like_count' | 'comment_count' | 'created_at' | 'updated_at'
      >;
      post_comments: Table<PostComment, 'post_id' | 'author_id' | 'body', 'id' | 'created_at'>;
      post_likes: Table<PostLike, 'post_id' | 'user_id', 'created_at'>;
      post_participants: Table<PostParticipation, 'post_id' | 'user_id', 'created_at'>;
    };
    Views: Record<never, never>;
    Functions: {
      get_candidates: {
        Args: { limit_count?: number };
        Returns: Candidate[];
      };
      get_likes_received: {
        Args: { limit_count?: number };
        Returns: LikeReceived[];
      };
      get_posts: {
        Args: {
          board_filter: BoardType;
          sport_filter?: string;
          before_id?: number;
          limit_count?: number;
        };
        Returns: PostItem[];
      };
      get_post: {
        Args: { p_post_id: number };
        Returns: PostItem[];
      };
      get_post_participants: {
        Args: { p_post_id: number };
        Returns: PostParticipant[];
      };
      get_comments: {
        Args: { p_post_id: number };
        Returns: CommentItem[];
      };
    };
    Enums: {
      gender: Gender;
      experience_level: ExperienceLevel;
      swipe_action: SwipeAction;
      report_status: ReportStatus;
      board_type: BoardType;
      trade_status: TradeStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
