import { Outlet } from "react-router-dom";
import BannerContainer from "../components/BannerContainer";
import ContainerRow from "../components/ContainerRow";
import FeedToggler from "../components/FeedToggler";
import { useAuth } from "../context/AuthContext";
import FeedProvider from "../context/FeedContext";
import PopularTags from "./../components/PopularTags";
import RecentlyViewed from "../components/RecentlyViewed";

function Home() {
  const { isAuth } = useAuth();

  return (
    <div className="home-page">
      {!isAuth && (
        <BannerContainer>
          <h1 className="logo-font">conduit</h1>
          <p>A place to share your knowledge.</p>
        </BannerContainer>
      )}
      <ContainerRow type="page">
        <FeedProvider>
          <div className="col-md-9">
            <FeedToggler />
            <Outlet />
          </div>

          <PopularTags />
          {/* REQ-108: renders nothing when there's no history, so the
              layout is unchanged for visitors with no recently-viewed
              articles. */}
          <RecentlyViewed />
        </FeedProvider>
      </ContainerRow>
    </div>
  );
}

export default Home;
