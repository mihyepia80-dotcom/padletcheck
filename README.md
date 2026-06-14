# 패들렛 과제 확인 앱

Padlet 게시글 제목(`2번 홍길동` 형식)을 기준으로 학생 과제 제출 현황을 확인하는 교사용 웹앱입니다.

- **2개 Padlet 유료 계정** (API 키 2개)
- **수십 개 Padlet 보드** 일괄 관리
- **학생 명단 붙여넣기** 입력
- **GitHub + Vercel + Firebase** 배포

## 기능

| 메뉴 | 설명 |
|------|------|
| 과제 확인 | 보드 선택 → Padlet 동기화 → 제출/미제출 현황 |
| 학생 명단 | `2번 홍길동` 형식으로 한 줄에 한 명씩 붙여넣기 |
| 보드 관리 | Padlet 보드 ID + API 계정(1/2) 등록, 일괄 추가 |

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사하여 `.env.local` 생성 후 값을 채웁니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|------|------|
| `PADLET_API_KEY_1` | Padlet 계정 1 API 키 |
| `PADLET_API_KEY_2` | Padlet 계정 2 API 키 |
| `ADMIN_PASSWORD` | 교사 로그인 비밀번호 |
| `SESSION_SECRET` | 16자 이상 랜덤 문자열 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase 서비스 계정 JSON (한 줄) |

> **API 키와 비밀번호는 절대 GitHub에 올리지 마세요.** `.env.local`은 `.gitignore`에 포함되어 있습니다.

### 3. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Firestore Database** 생성 (테스트 모드 또는 프로덕션 규칙)
3. **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성**
4. JSON 파일 내용을 한 줄로 `.env.local`의 `FIREBASE_SERVICE_ACCOUNT_JSON`에 붙여넣기

### 4. Padlet API 키 발급

1. [Padlet 설정 → Developer](https://padlet.com/dashboard/settings/developers)
2. 각 유료 계정에서 API 키 생성
3. 보드 ID는 Padlet 보드의 API 패널에서 확인

### 5. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

## Vercel 배포

1. GitHub에 저장소 push (`.env.local` 제외)
2. [Vercel](https://vercel.com)에서 Import
3. **Environment Variables**에 `.env.example` 항목 모두 등록
4. Deploy

## 사용 방법

### 학생 명단 입력

```
1번 김철수
2번 홍길동
3번 이영희
```

### 보드 일괄 추가 (수십 개)

```
# 주석 가능
국어 1차 | abcd1234efgh5678 | 1
수학 1차 | wxyz9876abcd1234 | 2
영어 1차 | qrst5678mnop9012
```

형식: `보드이름 | Padlet보드ID | API계정번호(1 또는 2, 생략 시 1)`

### 과제 확인

1. 보드 선택
2. **이 보드 동기화** 또는 **전체 동기화**
3. 제출/미제출 목록 확인, 미제출자 복사

## 보안

- Padlet API 호출은 **서버(API Route)에서만** 수행
- API 키는 Vercel 환경변수로만 보관
- 교사 1명용 비밀번호 + HTTP-only 쿠키 세션

## 기술 스택

- Next.js 15 (App Router)
- Tailwind CSS
- Firebase Firestore (Admin SDK)
- Padlet Public API
- Vercel
