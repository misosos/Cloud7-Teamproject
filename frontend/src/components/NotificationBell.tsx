// frontend/src/components/NotificationBell.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/store/authStore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCheckDouble } from "@fortawesome/free-solid-svg-icons";

// Warm Oak tokens
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const BRAND3 = "#4A3420";
const DANGER = "#B42318";

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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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

    const guildIdStr = String(notification.guildId);
    const targetPath = `/guild/${guildIdStr}/room?recordId=${notification.recordId}`;
    navigate(targetPath, { replace: false });

    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setShowDropdown(false);

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
        type="button"
        onClick={() => {
          setShowDropdown((prev) => !prev);
          if (!showDropdown) loadNotifications();
        }}
        className="relative inline-flex items-center justify-center rounded-xl p-2 transition outline-none
                   focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          color: BRAND3,
          background: "rgba(255,255,255,0.35)",
          border: "1px solid rgba(201,169,97,0.25)",
          boxShadow:
            "0 10px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.30)",
        }}
      >
        <FontAwesomeIcon icon={faBell} className="text-lg" />

        {/* unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full
                       text-[11px] font-black flex items-center justify-center"
            style={{
              background: DANGER, // 너무 튀지 않게: 진한 레드 + 작은 사이즈
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)",
              boxShadow: "0 8px 18px rgba(0,0,0,0.20)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl z-50 overflow-hidden"
          style={{
            background: SURFACE,
            border: "1px solid rgba(201,169,97,0.28)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* 헤더 */}
          <div
            className="p-4 flex items-center justify-between"
            style={{
              borderBottom: "1px solid rgba(107,78,47,0.18)",
            }}
          >
            <h3 className="font-black tracking-wide" style={{ color: TEXT }}>
              알림
            </h3>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-2 text-xs font-black tracking-wide rounded-xl px-3 py-2 transition"
                style={{
                  color: "#fff",
                  background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                  border: "1px solid rgba(201,169,97,0.30)",
                  boxShadow:
                    "0 10px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                <FontAwesomeIcon icon={faCheckDouble} />
                <span>모두 읽음</span>
              </button>
            )}
          </div>

          {/* 목록 */}
          <div
            className={`divide-y ${
              notifications.length > 3 ? "max-h-60 overflow-y-auto" : ""
            }`}
            style={{ borderColor: "rgba(107,78,47,0.16)" }}
          >
            {loading ? (
              <div className="p-4 text-center text-sm font-medium" style={{ color: MUTED }}>
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm font-medium" style={{ color: MUTED }}>
                알림이 없습니다.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="p-4 cursor-pointer transition"
                  style={{
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "rgba(201,169,97,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* 아바타 */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-black flex-shrink-0"
                      style={{
                        background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                        color: "#fff",
                        border: "1px solid rgba(201,169,97,0.28)",
                        boxShadow:
                          "0 10px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18)",
                      }}
                    >
                      {notification.fromUserName?.[0] || notification.fromUserEmail[0]}
                    </div>

                    {/* 본문 */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium break-words"
                        style={{ color: TEXT }}
                      >
                        {notification.content || "새 알림이 있습니다."}
                      </p>
                      <p className="text-xs mt-1 font-medium" style={{ color: MUTED }}>
                        {new Date(notification.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>

                    {/* 읽지 않음 점 */}
                    {!notification.isRead && (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2"
                        style={{
                          background: BRAND,
                          boxShadow: "0 0 0 3px rgba(201,169,97,0.18)",
                        }}
                        title="읽지 않은 알림"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 바닥 장식 */}
          <div
            className="h-1"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(201,169,97,0.55), transparent)",
              opacity: 0.8,
            }}
          />
        </div>
      )}
    </div>
  );
}