import { useTranslation } from "react-i18next";

const NoFriendsFound = () => {
  const { t } = useTranslation();
  return (
    <div className="card bg-base-200 p-6 text-center">
      <h3 className="font-semibold text-lg mb-2">{t("home.noFriendsTitle")}</h3>
      <p className="text-base-content opacity-70">
        {t("home.noFriendsBody")}
      </p>
    </div>
  );
};

export default NoFriendsFound;