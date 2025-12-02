import React from 'react';
import './AchievementDictionary.css';

interface Achievement {
  id: number;
  name: string;
  iconPlaceholder: string;
}

interface PersonalChallenge {
  id: number;
  name: string;
  progress: number;
  total: number;
  iconPlaceholder: string;
}

const AchievementDictionary: React.FC = () => {
  // 공식 업적 데이터 (나중에 백엔드에서 가져올 수 있음)
  const officialAchievements: Achievement[] = [
    { id: 1, name: '업적1', iconPlaceholder: '아이콘 공백' },
    { id: 2, name: '업적2', iconPlaceholder: '아이콘 공백' },
    { id: 3, name: '업적3', iconPlaceholder: '아이콘 공백' },
    { id: 4, name: '업적4', iconPlaceholder: '아이콘 공백' },
    { id: 5, name: '업적5', iconPlaceholder: '아이콘 공백' },
    { id: 6, name: '업적6', iconPlaceholder: '아이콘 공백' },
  ];

  // 개인 도전 데이터
  const personalChallenges: PersonalChallenge[] = [
    { id: 1, name: '개인도전1', progress: 0, total: 1, iconPlaceholder: '아이콘 공백' },
    { id: 2, name: '개인도전2', progress: 0, total: 1, iconPlaceholder: '아이콘 공백' },
    { id: 3, name: '개인도전3', progress: 0, total: 1, iconPlaceholder: '아이콘 공백' },
  ];

  return (
    <div className="achievement-dictionary">
      {/* 공식도감 섹션 */}
      <section className="official-section">
        <h2 className="section-title">공식도감</h2>
        <div className="achievement-grid">
          {officialAchievements.map((achievement) => (
            <div key={achievement.id} className="achievement-card">
              <div className="achievement-content">
                <h3 className="achievement-name">{achievement.name}</h3>
                <div className="icon-placeholder">
                  <span className="gear-icon">⚙️</span>
                </div>
                <p className="icon-label">{achievement.iconPlaceholder}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 개인도감 섹션 */}
      <section className="personal-section">
        <h2 className="section-title">개인도감</h2>
        <div className="challenge-list">
          {personalChallenges.map((challenge) => (
            <div key={challenge.id} className="challenge-card">
              <div className="challenge-header">
                <h3 className="challenge-name">{challenge.name}</h3>
                <div className="user-icon-placeholder">
                  <span className="user-icon">👤</span>
                </div>
                <p className="icon-label">{challenge.iconPlaceholder}</p>
              </div>
              <div className="progress-container">
                <div className="progress-bar-wrapper">
                  <span className="progress-label">진행상황예시</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="progress-status">
                    {challenge.progress >= challenge.total ? '달성' : `or 1/0`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AchievementDictionary;
