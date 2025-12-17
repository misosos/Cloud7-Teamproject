// frontend/src/components/NotificationBell.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/store/authStore";

type Notification = {
  id: string;
  userId: number;
  fromUserId: number;
  fromUserName: string | null;
  fromUserEmail: string;
  type: string;
  recordId: string | null;
  commentId: string | null;
  guildId: string | null;
  content: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationResponse = {
  ok: boolean;
  data: Notification[];
  error?: string;
};

type UnreadCountResponse = {
  ok: boolean;
  data: { count: number };
  error?: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = useAuthUser();
  const navigate = useNavigate();

  // 🔔 + 드롭다운 전체를 감쌀 ref
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // =========================
  // 알림 목록 로드
  // =========================
  const loadNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/guilds/notifications", {
        credentials: "include",
      });

      if (!response.ok) {
        setNotifications([]);
        return;
      }

      const json = (await response.json()) as NotificationResponse;

      if (json.ok) {
        if (json.data && Array.isArray(json.data)) {
          // 안 읽은 알림만 보여주기
          setNotifications(json.data.filter((n) => !n.isRead));
        } else {
          setNotifications([]);
        }
      } else {
        console.error("알림 응답 오류:", json.error);
        setNotifications([]);
      }
    } catch (err) {
      console.error("알림 로드 실패", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 안 읽은 개수 로드
  // =========================
  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/guilds/notifications/unread-count", {
        credentials: "include",
      });

      if (response.ok) {
        const json = (await response.json()) as UnreadCountResponse;
        if (json.ok && json.data) {
          setUnreadCount(json.data.count);
        }
      }
    } catch (err) {
      console.error("읽지 않은 알림 개수 로드 실패", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    loadNotifications();
    loadUnreadCount();

    // 30초마다 개수만 갱신
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // =========================
  // 드롭다운 밖 클릭하면 닫기
  // =========================
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // =========================
  // 개별 알림 클릭
  // =========================
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.recordId || !notification.guildId) return;

    // 알림 읽음 처리
    if (!notification.isRead) {
      try {
        await fetch(`/api/guilds/notifications/${notification.id}/read`, {
          method: "PATCH",
          credentials: "include",
        });
      } catch (err) {
        console.error("알림 읽음 처리 실패", err);
      }
    }

    // 길드 방으로 이동 (/guilds ❌ → /guild ✅)
    const guildIdStr = String(notification.guildId);
    const targetPath = `/guild/${guildIdStr}/room?recordId=${notification.recordId}`;
    navigate(targetPath, { replace: false });

    // 프론트에서 바로 제거 & 카운트 감소
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    setShowDropdown(false);

    // 서버 기준으로 동기화
    setTimeout(() => {
      loadNotifications();
      loadUnreadCount();
    }, 500);
  };

  // =========================
  // 모든 알림 읽음 처리
  // =========================
  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/guilds/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
      });

      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("모든 알림 읽음 처리 실패", err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      {/* 종 아이콘 버튼 */}
      <button
        onClick={() => {
          setShowDropdown((prev) => !prev);
          if (!showDropdown) {
            loadNotifications();
          }
        }}
        className="relative p-2 text-stone-600 hover:text-stone-800 transition"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-stone-200 z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-stone-800">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div
            className={`divide-y ${
              notifications.length > 3 ? "max-h-60 overflow-y-auto" : ""
            }`}
          >
            {loading ? (
              <div className="p-4 text-center text-stone-500 text-sm">
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-stone-500 text-sm">
                알림이 없습니다.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer hover:bg-stone-50 transition ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b6f47] to-[#6b4e2f] text-sm flex items-center justify-center text-white font-black flex-shrink-0">
                      {notification.fromUserName?.[0] ||
                        notification.fromUserEmail[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-800 font-medium break-words">
                        {notification.content || "새 알림이 있습니다."}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString(
                          "ko-KR",
                        )}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
