--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: coin_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.coin_requests (
    id integer NOT NULL,
    child_id integer NOT NULL,
    parent_id integer NOT NULL,
    requested_amount numeric(10,2) NOT NULL,
    approved_amount numeric(10,2),
    reason text NOT NULL,
    status text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT coin_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.coin_requests OWNER TO neondb_owner;

--
-- Name: coin_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.coin_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coin_requests_id_seq OWNER TO neondb_owner;

--
-- Name: coin_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.coin_requests_id_seq OWNED BY public.coin_requests.id;


--
-- Name: coins; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.coins (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    reason text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coins OWNER TO neondb_owner;

--
-- Name: coins_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.coins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coins_id_seq OWNER TO neondb_owner;

--
-- Name: coins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.coins_id_seq OWNED BY public.coins.id;


--
-- Name: delete_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.delete_requests (
    id integer NOT NULL,
    child_id integer NOT NULL,
    parent_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.delete_requests OWNER TO neondb_owner;

--
-- Name: delete_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.delete_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delete_requests_id_seq OWNER TO neondb_owner;

--
-- Name: delete_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.delete_requests_id_seq OWNED BY public.delete_requests.id;


--
-- Name: game_time_purchases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.game_time_purchases (
    id integer NOT NULL,
    child_id integer NOT NULL,
    days numeric(10,2) NOT NULL,
    coins_spent numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_time_purchases OWNER TO neondb_owner;

--
-- Name: game_time_purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.game_time_purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_time_purchases_id_seq OWNER TO neondb_owner;

--
-- Name: game_time_purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.game_time_purchases_id_seq OWNED BY public.game_time_purchases.id;


--
-- Name: game_time_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.game_time_requests (
    id integer NOT NULL,
    child_id integer NOT NULL,
    parent_id integer,
    days numeric(10,2) NOT NULL,
    status text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_time_requests OWNER TO neondb_owner;

--
-- Name: game_time_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.game_time_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_time_requests_id_seq OWNER TO neondb_owner;

--
-- Name: game_time_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.game_time_requests_id_seq OWNED BY public.game_time_requests.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text NOT NULL,
    parent_id integer,
    coin_balance numeric(10,2) DEFAULT 0 NOT NULL,
    coin_unit text DEFAULT '밸리코인'::text
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: coin_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.coin_requests ALTER COLUMN id SET DEFAULT nextval('public.coin_requests_id_seq'::regclass);


--
-- Name: coins id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.coins ALTER COLUMN id SET DEFAULT nextval('public.coins_id_seq'::regclass);


--
-- Name: delete_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delete_requests ALTER COLUMN id SET DEFAULT nextval('public.delete_requests_id_seq'::regclass);


--
-- Name: game_time_purchases id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_time_purchases ALTER COLUMN id SET DEFAULT nextval('public.game_time_purchases_id_seq'::regclass);


--
-- Name: game_time_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_time_requests ALTER COLUMN id SET DEFAULT nextval('public.game_time_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: coin_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.coin_requests (id, child_id, parent_id, requested_amount, approved_amount, reason, status, created_at) FROM stdin;
1	11	1	1.00	0.10	123	approved	2025-02-16 09:13:10.208966
2	11	1	1.00	1.50	로드맵 수립 (전략) 장표 제작 완료	approved	2025-02-16 11:46:01.885323
3	11	1	1.00	\N	Resource hub 게시판 장표 완료	rejected	2025-02-16 18:16:26.488906
4	11	1	0.30	\N	1-1-d 이후 들어갈 장표 구체화	rejected	2025-02-16 18:17:32.371873
5	11	1	1.50	1.50	My page, screen flow 장표 & 디자인 시스템 장표 완료	approved	2025-02-16 20:04:20.606513
6	18	16	3.00	\N	책 1시간 읽기	pending	2025-02-17 02:03:35.350874
7	11	1	0.50	\N	빅5 검사	rejected	2025-02-17 08:46:09.546573
8	11	1	1.00	1.00	[주둥이코딩 사이트 개선] 살펴보기 / 해당 사이트의 역할 구체화 (오빠한테 물어보기)	approved	2025-02-18 18:31:47.171283
9	11	1	1.00	\N	주둥이코딩 사이트 개선] 살펴보기 / 해당 사이트의 역할 구체화 (오빠한테 물어보기)	rejected	2025-02-18 18:40:57.085418
10	11	1	0.20	0.20	부지런기상(반벌떡!)	approved	2025-02-19 03:12:42.409835
11	11	1	0.01	0.01	아이디자인랩 입사지원 히히	approved	2025-02-19 08:01:54.23723
12	11	1	0.19	0.19	채무조정(5일 감면)	approved	2025-02-19 18:47:44.76255
14	11	1	0.20	0.30	주둥이코딩 사이트 접근 시나리오 녹음본 인덱싱	approved	2025-02-20 08:25:58.250333
13	11	1	0.50	0.60	사이트 접점 경로 녹음 내용 정리	approved	2025-02-20 07:41:42.571485
15	11	1	2.00	2.00	- [주둥이코딩 사이트 개선] 개선 계획 초안 잡기 (메뉴-IA, 들어갈 기능/콘텐츠 분류)	approved	2025-02-20 14:31:36.656179
16	11	1	0.01	0.01	쿠팡체험단 리뷰 작성	approved	2025-02-20 15:06:00.030122
17	11	1	0.50	0.50	- [UX 심리학 스터디] 회의록 정리: 0219	approved	2025-02-20 15:09:31.896533
\.


--
-- Data for Name: coins; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.coins (id, user_id, amount, reason, created_at) FROM stdin;
18	11	0.20	규학님, 다음주 금요일 일정 취소 알림	2025-02-15 13:49:59.436389
19	11	2.80	1-1-a. 오버뷰 페이지 만들기	2025-02-15 13:57:58.703417
20	11	1.00	포기하지않음! 대견한!!	2025-02-15 14:28:41.085781
21	11	1.00	프롬프트 매니저 초기아이디어 정리 및 회의 완료	2025-02-15 17:14:23.394574
22	11	0.50	칼로리 계산(0.2) + 건강한 식사 아침(0.3)	2025-02-16 05:47:30.336471
23	11	1.00	주코단 마스토돈 확인 & 피드백	2025-02-16 09:12:39.937034
24	11	0.10	코인지급요청 테스트 참여 보상	2025-02-16 09:14:17.917947
25	11	1.50	로드맵 수립 (전략) 장표 제작 완료	2025-02-16 11:46:51.986016
26	11	0.10	1-1-e. 화면디자인:게시판 장표를 만들기위한 준비작업	2025-02-16 12:53:21.675063
27	11	0.50	승우 냉장고에 김치 정리 도와주기	2025-02-16 12:54:00.269085
28	11	0.30	건강한 식사 저녁	2025-02-16 12:54:53.687066
29	11	1.00	리플릿 레퍼러 가입!	2025-02-16 14:28:37.901359
30	11	0.30	1-2. 1-1-d 이후 들어갈 장표 구체화	2025-02-16 18:17:48.144798
31	11	1.00	1-1-f. Resource hub 게시판 장표 완료	2025-02-16 18:18:17.284647
32	12	0.30	페르소나 작성 32번 문항 작성하기	2025-02-16 18:25:49.386341
33	12	3.00	페르소나 작성을 위한 심층 질문 1차 초안 작성하기	2025-02-16 18:58:32.099621
34	11	1.00	1-1-g. Life guide 게시판 장표 완료	2025-02-16 19:02:58.658362
35	12	3.00	페르소나 작성한거 GPT가 구체화한거에서 취할거 취해서 옵시디언으로 정리하기	2025-02-16 20:19:51.190436
36	11	1.50	My page, screen flow 장표 & 디자인 시스템 장표 완료	2025-02-16 20:39:34.534009
37	11	2.00	포폴 업데이트 축하해요!!	2025-02-16 21:29:45.23731
38	18	2.00	방청소	2025-02-17 02:02:37.578155
39	11	0.50	부지런기상!	2025-02-17 04:46:14.496114
40	11	0.10	1-1-b. Research: 인사이트; 재한 외국인 풀 형성 필요. & 조사 과정에서 그들에게 필요한 정보 채널이 흩어져있음을 발견	2025-02-17 04:58:22.075008
41	11	1.00	1-1-d. 콘텐츠 번역 자동화 구현 (MAKE)	2025-02-17 04:58:33.714397
42	11	1.00	1-1. 장표 추가	2025-02-17 04:58:41.15407
43	11	1.00	1. 포트폴리오 프로젝트 정리 / 사이드프로젝트 작업했던 것 정리하기	2025-02-17 04:58:48.22989
44	11	3.00	- 원서 제출하기(포폴 프로젝트 정리, 포폴 정리, 이력서&경력기술서 정리) ← 주말에 할 것!	2025-02-17 04:58:55.364849
45	12	1.00	페르소나 심층질문 48문항 완료 보상!(밍)	2025-02-17 05:06:16.09562
46	11	0.50	빅5 검사 (15분)	2025-02-17 10:10:16.245599
47	11	2.00	백섭 & 점검보상 	2025-02-18 15:20:01.743735
48	11	0.50	부지런기상!	2025-02-18 15:20:27.329654
49	11	0.10	낮잠벌떡기상보상	2025-02-18 15:20:36.206738
50	11	1.50	UX 스터디, UX 프로세스 구조 depth 정리하기 ← 퍼플렉시티로 정리해보기	2025-02-18 15:24:09.109741
51	11	0.10	포폴 회고-1 관련 AI 대화창 열어놓기	2025-02-18 15:25:04.452949
52	11	0.50	주코딩 회의 (레고 사례, 전자책, 무료강의 콘텐츠에 대해서)	2025-02-18 15:26:54.490281
53	12	1.00	레고 사례를 바탕으로 주코단의 핵심 질문(살아있음의 역할은 무엇인가?) 발굴 및 주코단의 경험 정의(=살아있음)	2025-02-18 15:28:20.848581
54	11	1.00	[주둥이코딩 사이트 개선] 살펴보기 / 해당 사이트의 역할 구체화 (오빠한테 물어보기)	2025-02-18 18:32:00.639025
55	12	0.50	[주둥이코딩 사이트 개선] 살펴보기 / 해당 사이트의 역할 구체화 (회의)	2025-02-18 18:41:41.770476
56	12	0.20	살아있음' → '탐험' 연결을 레고의 아이,즐거운 경험 → '놀이' 자연스럽게 연결되는것처럼 레벨을 동일하게 정리하기, 일단 표로 만들어볼까?	2025-02-18 19:22:44.719688
57	12	2.00	살아있음' → '탐험' 연결을 레고의 아이,즐거운 경험 → '놀이' 자연스럽게 연결되는것처럼 레벨을 동일하게 정리하기	2025-02-18 19:22:50.480683
58	12	0.30	[반복퀘스트] 막히는 것에 AI 써보기, 새로운 관점으로 AI 쓰기 (LLM이 레벨 분류나 범주나 이런것 왜 안맞는지 잘 이해하므로)	2025-02-18 19:29:28.832099
59	12	0.10	밍송이 기상 도와줌!	2025-02-19 03:25:57.763258
61	11	0.20	부지런기상(반벌떡!)	2025-02-19 11:48:50.669121
62	11	0.01	아이디자인랩 입사지원 히히	2025-02-19 11:48:58.192301
60	11	2.00	송준용 대표님 저녁식사, 이런저런 제안이 왔을때 가장 중요한건 생계다! 아이스브레이킹은 나를 위해 하는 것이다.	2025-02-19 11:48:18.689339
63	11	0.19	채무조정(5일 감면)	2025-02-20 04:12:59.527022
64	11	0.50	부지런기상!	2025-02-20 04:13:09.186232
65	11	0.30	주둥이코딩 사이트 접근 시나리오 녹음본 인덱싱	2025-02-20 08:27:49.087717
66	11	0.60	사이트 접점 경로 녹음 내용 정리	2025-02-20 08:28:04.444594
67	11	2.00	- [주둥이코딩 사이트 개선] 개선 계획 초안 잡기 (메뉴-IA, 들어갈 기능/콘텐츠 분류)	2025-02-20 15:06:26.438927
68	11	0.01	쿠팡체험단 리뷰 작성	2025-02-20 15:06:34.846627
69	11	0.50	- [UX 심리학 스터디] 회의록 정리: 0219	2025-02-20 15:12:09.83296
\.


--
-- Data for Name: delete_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.delete_requests (id, child_id, parent_id, created_at) FROM stdin;
\.


--
-- Data for Name: game_time_purchases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.game_time_purchases (id, child_id, days, coins_spent, created_at) FROM stdin;
1	6	2.00	2.00	2025-02-15 12:28:01.026593
3	11	2.00	2.00	2025-02-15 15:38:00.967695
4	11	1.00	1.00	2025-02-15 17:41:46.710999
5	11	1.00	1.00	2025-02-16 06:59:39.093982
6	11	1.00	1.00	2025-02-16 07:37:01.53762
7	11	1.00	1.00	2025-02-16 13:40:44.298332
8	11	1.00	1.00	2025-02-16 14:12:18.582686
9	11	1.00	1.00	2025-02-16 14:12:32.104776
10	18	1.00	1.00	2025-02-17 02:03:22.630511
11	11	2.00	2.00	2025-02-17 05:00:40.188248
12	11	2.00	2.00	2025-02-17 06:58:40.364236
13	11	1.00	1.00	2025-02-17 06:58:43.170697
14	11	7.00	7.00	2025-02-18 15:19:18.898928
15	11	1.00	1.00	2025-02-18 15:19:41.060447
16	11	2.00	2.00	2025-02-18 15:25:23.266685
17	11	1.00	1.00	2025-02-18 15:54:47.902571
18	11	1.00	1.00	2025-02-19 03:54:33.07048
19	11	2.00	2.00	2025-02-19 11:45:25.154496
20	11	3.00	3.00	2025-02-19 18:46:48.024709
21	11	2.00	2.00	2025-02-20 08:43:52.187322
22	11	2.00	2.00	2025-02-20 16:25:59.788045
\.


--
-- Data for Name: game_time_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.game_time_requests (id, child_id, parent_id, days, status, created_at) FROM stdin;
1	6	5	3.00	approved	2025-02-15 12:27:20.84969
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
wS2NSuP3eL10Xhpm7ADcVBmrO5h7_tz5	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-22T13:11:09.426Z","secure":false,"httpOnly":true,"path":"/"}}	2025-02-22 13:11:10
Ug7FMYZE6oWpQ1aymlwJjFjjogNZ9DEO	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-24T04:45:28.429Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-24 04:46:21
cVHhfYVTFVnaLm7XWNMzN80JrhmdoVd5	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-22T15:19:06.685Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-22 17:41:09
aixG7yULvExHzPZcchnM0gfkCtCRr5YT	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-24T08:35:30.328Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":19}}	2025-02-24 08:36:02
C6pKQd_ZBcvWYR0Aj4yPofC7-rvGBe1_	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-24T02:03:10.415Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2025-02-24 02:03:50
faGfk4sgFA6g4wLI1H0b_dxPY2nhwht8	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-23T20:20:27.201Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":12}}	2025-02-24 08:28:29
o_e7rLpnd_I-Pm8JKk-aGNekk2FTXqsv	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-23T14:28:11.455Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-24 04:58:56
HvhPKKZNb078ImY5DvdqokVoFLXV191t	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-24T10:10:18.168Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-02-24 10:10:25
nop5ZytOQRWTOA-L1ZQTDH6d8NJJf_gB	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-23T11:38:28.204Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-25 15:15:49
JYAIAtIVlCoppN1TrOwnyuulDpWc4jNr	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-22T13:40:46.076Z","secure":false,"httpOnly":true,"path":"/"}}	2025-02-22 13:40:54
4k8e_xXFr5WATghIhthJIEY1a_EwG2Rp	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-26T03:24:45.887Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-26 03:25:58
Q66ZCp3J-s0PgxnZMgGAgFAw3OEgmDgG	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-26T03:12:08.427Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":11}}	2025-02-26 03:12:43
t6czT9o5wD_S4It625P7kMu5M2wp4ElF	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-23T20:37:03.375Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":15}}	2025-02-23 20:37:04
T_ZBkAk-kymzv0YhspHQjsZLQVtgxvys	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-23T21:28:34.258Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-23 21:29:46
7Y_DZxrY_IYPFdLaqzo9Qy5EFh6J2Q5i	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-26T11:46:55.453Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-26 11:50:22
jyoohJYWtnNdr9SPO91VwGkmiV5YgSl9	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-23T20:13:55.172Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":13}}	2025-02-23 20:13:56
L4BCnV3HlIruDoK3AQ4eXOjMnYDEcQ17	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-23T20:32:19.952Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":14}}	2025-02-23 20:32:23
KwONME0ArMIQwctYyJzMJkNwJVIp_jpW	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-26T18:46:35.548Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":11}}	2025-02-26 18:47:45
UNAkZKH_Fxued9KWe4LlGlAjTmO70-YY	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-27T04:12:47.858Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-27 04:13:10
PL2cDv9uFcCKVrpDo1oPOk2Gp1q2xcBW	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-27T05:14:58.045Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-27 05:14:59
VkAPuH6gG8Ms_Iv14zt722lN84PW6XOw	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-25T18:41:34.240Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":1}}	2025-02-27 15:12:17
tnsd1fx1xGSEwPtU4ieNVeYI1d46VBOL	{"cookie":{"originalMaxAge":604800000,"expires":"2025-02-22T15:25:09.328Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":11}}	2025-02-27 16:26:00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, role, parent_id, coin_balance, coin_unit) FROM stdin;
16	78000	741a30dc06d2df6ab20e4721650b18f879a62a5d0b460a2657e04f930a2e967d285f5230024c1da12aa2e2bf859de1737140a7eb7052e36230b22ff7394f63a9.bbabd0c2fb26f011cccc7541eaa2d1ee	parent	\N	0.00	밸리코인
1	wingseraq	70b5d6934c8e99ba7c4b017ba6a5707d9d9ce00e8561023da5ebaf673674b716d293cf6ec2f04a56d41bb6c521bc534096c7c48e2ad8f2b95f83d9a7249f9b1f.6f9428bfae12d29ee4c2a84be2cd3907	parent	\N	0.00	밸리코인
4		92445ac82f85ba6cccfe010ce473de24ccae46136444b03b17012227e001613c1269f328072caba042b508d2eda4b806150f1196be3151f3e56d519dd057fdcd.2d2915aa8059fc8b6cbb76f2460bd6e9	parent	\N	0.00	밸리코인
5	hwanys2	08b6ff2384202903d1ca93f1ad1b5ba4625aedf8d3cbeb0cf1b2d728c2da73d4b975e048db8d913b41a06ed06a561ba687d12760ce082b594c90382504f16415.99a75fad363f43a0cab2aad3a990c2d7	parent	\N	0.00	밸리코인
6	hwanys3	dc74fc80bc282937d24cc0626a06defb48f49d508f1d444e2e2e50faee6f7b77b96d4cc076ac4146784e5930a929989fc45d2ef79ccbed689ed187a03c0e938f.3ac3c66a43a3a3642c9f13017b92865b	child	5	0.00	밸리코인
17	11	fde08cb2dd9ec33ce04c93845393866b3c8450bcbf34495cca7bfaa47f8d19bf855178767d895a3f4e35a7c17a74baa32aba4c47c199a2a3b0b9da2172693ad9.c5d6d257a8b2e4ea72f44667de9428c9	child	16	0.00	밸리코인
18	22	dd30f3889b43ab16319abaf89847b1853ce2155f95df41ae79da6a628a57cf2d9ffcceaab141e674fd5b8466365f81532d2191964b9b5b5e079668bc816645dd.29714336fc66ac6e326c8fc9833c47b2	child	16	1.00	밸리코인
10	ㅁㅁ	fa3853dc41b22328d6b013b652dfbe7ffc19678e0acab911ce0fd36da12e898829cb81398f868bfd57d5d7c08a76c36645a555164d87b4a04ac8f09cf59a9539.94c035f5a4b4cb89c3ac94511d0e208e	parent	\N	0.00	밸리코인
19	xoss	059830f8a18aff9b4ee1baa24b811fdb34afa7a3a3f2e0fc009df4bbdb761bc3f9b06e637120880d80ba4f3649aca73e78e707feb3913dd984fd60e56018445b.c20171c0b069d64db79f874d17bca0d9	parent	\N	0.00	밸리코인
11	ming	6bbfc4ddaa23608299534892cc7df3f862e583570f856799fb79a6a6c2b68670d983735d0b6a16c6a651ba68c233edfe1d9678c47a943009367e97c06f528ed6.ea0a3245824c8ae460a4ed20477ec21b	child	1	0.91	밸리코인
13	missouri_hilpert@banglemail.com	ec46f535ec325a0e836a68d41a6018334d935f70e83e8e9424abbdf47e5d03d163528524aeba00d8639147547116febd116ba9154f22b1f15dd0ebf2b56b83e5.82f63e65e9f9e7d84131b66d55dc80dc	parent	\N	0.00	밸리코인
14	roos_brink@banglemail.com	6eeefd4451e87dcc2927fe473ce9813c159f592e50d92365e80ad937f899d33fa343c301dce1bbdc94be17e0b6052a15d06eb73615d62879b49b14f53304ff88.42f5e9aa9e3e42c5d01e6389fabc26ff	parent	\N	0.00	밸리코인
15	dane50@banglemail.com	19cf6b9b238dd07391fc2b194a76a17616988507658bafefb370fdc95805e54152585e0b14506a846159209729ee8d86cf840cb1e32a949ae7929e2094c09d8a.397a67d78e8a1d90bda5928a5e94a7f0	parent	\N	0.00	밸리코인
12	wing	e191226148d61f8ebdc09ad05af36a3ad091786ac6bf1e5a6a716ff9dd9248da705fa3e3e0ee688552cf0ba25244375f71940e8615d9ab09df15eddff346b9da.2ba50d4e5bbcb73653875212c85d1f5b	child	1	11.40	애플코인
\.


--
-- Name: coin_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.coin_requests_id_seq', 17, true);


--
-- Name: coins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.coins_id_seq', 69, true);


--
-- Name: delete_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.delete_requests_id_seq', 4, true);


--
-- Name: game_time_purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.game_time_purchases_id_seq', 22, true);


--
-- Name: game_time_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.game_time_requests_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 19, true);


--
-- Name: coin_requests coin_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.coin_requests
    ADD CONSTRAINT coin_requests_pkey PRIMARY KEY (id);


--
-- Name: coins coins_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.coins
    ADD CONSTRAINT coins_pkey PRIMARY KEY (id);


--
-- Name: delete_requests delete_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delete_requests
    ADD CONSTRAINT delete_requests_pkey PRIMARY KEY (id);


--
-- Name: game_time_purchases game_time_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_time_purchases
    ADD CONSTRAINT game_time_purchases_pkey PRIMARY KEY (id);


--
-- Name: game_time_requests game_time_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_time_requests
    ADD CONSTRAINT game_time_requests_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: coin_requests coin_requests_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.coin_requests
    ADD CONSTRAINT coin_requests_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.users(id);


--
-- Name: coin_requests coin_requests_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.coin_requests
    ADD CONSTRAINT coin_requests_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: coins coins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.coins
    ADD CONSTRAINT coins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: delete_requests delete_requests_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delete_requests
    ADD CONSTRAINT delete_requests_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.users(id);


--
-- Name: delete_requests delete_requests_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delete_requests
    ADD CONSTRAINT delete_requests_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: game_time_purchases game_time_purchases_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_time_purchases
    ADD CONSTRAINT game_time_purchases_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.users(id);


--
-- Name: game_time_requests game_time_requests_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_time_requests
    ADD CONSTRAINT game_time_requests_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.users(id);


--
-- Name: game_time_requests game_time_requests_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_time_requests
    ADD CONSTRAINT game_time_requests_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: users users_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

