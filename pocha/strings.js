// Screen text. Code never holds Korean; add a language by adding a block.
// Signs over the stalls are always in the city's own language (Seoul: old-style Korean shop boards); the player's
// language shows on a small plate under each sign, hidden when it is the same language.
export const CITY = {
  seoul: { lang: 'ko', fish: '붕어빵', oden: '어묵', tteok: '떡볶이', hotteok: '호떡', gate: '백호 야시장' },
}
export const STR = {
  en: {
    title: 'Baekho Pocha', sub: 'Seoul night market', start: 'Open the stall',
    hint: 'Drag to move · stand on a spot to work',
    fish: 'Bungeoppang', oden: 'Eomuk', tteok: 'Tteokbokki', hotteok: 'Hotteok',
    cashier: 'Till helper', carrier: 'Runner helper', cook: 'Cook helper', arch: 'Market gate',
    next: 'Next', street: 'Street', rush: 'Rush hour!', rushSoon: 'Crowd coming…',
    clear: 'Seoul night market done!', time: 'Time', earned: 'Earned', served: 'Served', lost: 'Left angry',
    nextCity: 'Next city', tokyo: 'Tokyo', again: 'Play again',
    talk: {
      wait: ['Hurry~', 'Why is this line so long', 'Smells good!', 'Still waiting…'],
      rush: ['Two please!', 'Me first!', 'So many people!'],
      happy: ['Yum!', 'Best in Seoul', 'Coming back tomorrow'],
      angry: ['Forget it!', 'Too slow!'],
      staff: ['So busy!', 'Boss, take a break', 'On it!'],
      sleep: ['So sleepy…'],
    },
  },
  ko: {
    title: '백호 포장마차', sub: '서울 야시장', start: '장사 시작',
    hint: '드래그로 걷기 · 자리에 서면 일해요',
    fish: '붕어빵', oden: '어묵', tteok: '떡볶이', hotteok: '호떡',
    cashier: '계산 직원', carrier: '나르기 직원', cook: '조리 직원', arch: '야시장 간판',
    next: '다음', street: '골목', rush: '손님 몰려온다!', rushSoon: '손님이 몰려와요…',
    clear: '서울 야시장 완성!', time: '걸린 시간', earned: '번 돈', served: '손님', lost: '화나서 감',
    nextCity: '다음 도시', tokyo: '도쿄', again: '다시 하기',
    talk: {
      wait: ['빨리요~', '줄 왜 이래', '냄새 좋다', '아직이에요?'],
      rush: ['두 개요!', '저 먼저요!', '사람 왜 이렇게 많아'],
      happy: ['맛있다!', '서울 최고', '내일 또 올게요'],
      angry: ['안 먹어!', '너무 느려!'],
      staff: ['아 바쁘다', '사장님 쉬세요', '제가 할게요!'],
      sleep: ['졸려…'],
    },
  },
}
