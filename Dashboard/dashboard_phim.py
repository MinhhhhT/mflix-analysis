import streamlit as st
import pandas as pd
import plotly.express as px
import requests
import re

# ===== Cấu hình giao diện chính =====
st.set_page_config(page_title="Chiến lược sản xuất phim", layout="wide")

# ===== Đọc dữ liệu từ API =====
@st.cache_data
def load_data(api_base_url):
    try:
        # Define API endpoints
        endpoints = {
            "monthly_stats": f"{api_base_url}/v1/movie/monthly-stats",
            "top_countries": f"{api_base_url}/v1/movie/top-countries",
            "runtime_impact": f"{api_base_url}/v1/movie/runtime-impact",
            "top_actors": f"{api_base_url}/v1/movie/top-actors",
            "top_directors": f"{api_base_url}/v1/movie/top-directors",
            "top_genres": f"{api_base_url}/v1/movie/top-genres"
        }

        # Fetch data from API
        months_df = pd.DataFrame(requests.get(endpoints["monthly_stats"]).json())
        countries_df = pd.DataFrame(requests.get(endpoints["top_countries"]).json())
        runtime_df = pd.DataFrame(requests.get(endpoints["runtime_impact"]).json())
        actors_df = pd.DataFrame(requests.get(endpoints["top_actors"]).json())
        directors_df = pd.DataFrame(requests.get(endpoints["top_directors"]).json())
        genres_df = pd.DataFrame(requests.get(endpoints["top_genres"]).json())

        return months_df, countries_df, runtime_df, actors_df, directors_df, genres_df
    except requests.RequestException as e:
        st.error(f"Error fetching data from API: {e}")
        return None, None, None, None, None, None

# Sidebar for API base URL
st.sidebar.title("Cấu hình API")
api_base_url = st.sidebar.text_input("API Base URL", value="http://localhost:8000")

# Load data
months_df, countries_df, runtime_df, actors_df, directors_df, genres_df = load_data(api_base_url)

# Check if data loaded successfully
if any(df is None for df in [months_df, countries_df, runtime_df, actors_df, directors_df, genres_df]):
    st.stop()

# ===== Hàm tính điểm tổng hợp =====
def calculate_composite_score(df, rating_col, count_col, weight_imdb):
    if count_col not in df.columns or rating_col not in df.columns:
        st.error(f"Error: One or both columns '{rating_col}' and '{count_col}' not found in DataFrame. Available columns: {list(df.columns)}")
        return df
    max_rating = df[rating_col].max()
    max_count = df[count_col].max()
    if max_count == 0 or pd.isna(max_count):
        st.warning(f"Warning: '{count_col}' has no valid data (max = {max_count}). Skipping composite score calculation.")
        df["composite_score"] = 0
    else:
        df["composite_score"] = (df[rating_col] / max_rating) * weight_imdb + (df[count_col] / max_count) * (1 - weight_imdb)
    return df

# ===== Sidebar =====
st.sidebar.title("Chọn mục")
tabs = ["Thời điểm ra mắt", "Quốc gia sản xuất", "Thời lượng phim", 
        "Diễn viên & Đạo diễn", "Thể loại phim", "Gợi ý tổng hợp"]
choice = st.sidebar.radio("Đi tới mục:", tabs)

# Thêm slider để điều chỉnh trọng số IMDb vs. totalMovies
weight_imdb = st.sidebar.slider("Trọng số IMDb (vs. Số phim):", 0.0, 1.0, 0.6, 0.1)

# Áp dụng composite score cho các DataFrame
months_df = calculate_composite_score(months_df, "avgImdbRating", "totalMoviesReleased", weight_imdb)
countries_df = calculate_composite_score(countries_df, "avgImdbRating", "totalMovies", weight_imdb)
runtime_df = calculate_composite_score(runtime_df, "avgImdbRating", "totalMovies", weight_imdb)
actors_df = calculate_composite_score(actors_df, "avgImdbRating", "totalMovies", weight_imdb)
directors_df = calculate_composite_score(directors_df, "avgImdbRating", "totalMovies", weight_imdb)
genres_df = calculate_composite_score(genres_df, "avgImdbRating", "totalMovies", weight_imdb)

st.title("Dashboard Chiến Lược Sản Xuất Phim Ăn Khách")
st.markdown("""
    Phân tích dữ liệu để đưa ra **gợi ý tối ưu về thời điểm, quốc gia, thể loại, diễn viên, đạo diễn, thời lượng** giúp bộ phim của bạn được đánh giá cao và đón nhận nồng nhiệt.  
    **Trọng số IMDb**: {0:.1f} (Chất lượng), **Trọng số Số phim**: {1:.1f} (Số lượng).
""".format(weight_imdb, 1 - weight_imdb))

# ===== TAB 1: Thời điểm ra mắt =====
if choice == tabs[0]:
    st.subheader("Phân tích thời điểm ra mắt")
    col1, col2 = st.columns(2)

    with col1:
        sorted_months_df = months_df.sort_values("composite_score", ascending=False)
        fig1 = px.bar(sorted_months_df, x="monthName", y="avgCommentsPerMovie",
                      title="Bình luận trung bình theo tháng (Sắp xếp theo điểm tổng hợp)",
                      labels={"avgCommentsPerMovie": "Số bình luận trung bình mỗi phim", "monthName": "Tháng"},
                      text="totalMoviesReleased", color="composite_score")
        fig1.update_traces(texttemplate="%{text} phim", textposition="auto")
        fig1.update_layout(xaxis={"tickangle": 45})
        st.plotly_chart(fig1, use_container_width=True)

    with col2:
        month_order = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"]
        fig2 = px.line(months_df, x="monthName", y="avgImdbRating",
                       title="IMDb trung bình theo tháng", markers=True,
                       labels={"avgImdbRating": "Điểm IMDb", "monthName": "Tháng"})
        fig2.update_layout(xaxis={"categoryorder": "array", "categoryarray": month_order})
        for i, row in months_df.iterrows():
            if row["composite_score"] > months_df["composite_score"].quantile(0.75):
                fig2.add_annotation(x=row["monthName"], y=row["avgImdbRating"],
                                   text=f"{row['avgImdbRating']:.1f} ({row['totalMoviesReleased']} phim)", showarrow=True)
        st.plotly_chart(fig2, use_container_width=True)

# ===== TAB 2: Quốc gia sản xuất =====
elif choice == tabs[1]:
    st.subheader("Quốc gia sản xuất và điểm IMDb")
    top_n = st.sidebar.slider("Số quốc gia hiển thị:", 5, 20, 10)
    filtered_countries_df = countries_df.sort_values("composite_score", ascending=False).head(top_n)
    fig = px.bar(filtered_countries_df, x="country", y="avgImdbRating",
                 color="composite_score", title=f"Top {top_n} quốc gia (Điểm tổng hợp)",
                 labels={"avgImdbRating": "Điểm IMDb", "country": "Quốc gia"},
                 text="totalMovies")
    fig.update_traces(texttemplate="%{text} phim", textposition="auto")
    fig.update_layout(xaxis={"tickangle": 45})
    st.plotly_chart(fig, use_container_width=True)

# ===== TAB 3: Thời lượng phim =====
elif choice == tabs[2]:
    st.subheader("Thời lượng phim và đánh giá")
    col1, col2 = st.columns(2)
    
    with col1:
        # Clean runtimeRange for sorting by extracting the first number
        def extract_first_number(range_str):
            # Extract the first number using regex, removing any non-numeric suffixes
            match = re.match(r"(\d+)", range_str)
            return int(match.group(1)) if match else 0
        
        runtime_order = sorted(runtime_df["runtimeRange"].unique(), key=extract_first_number)
        fig1 = px.box(runtime_df, x="runtimeRange", y="avgImdbRating",
                      title="Phân phối IMDb theo thời lượng phim",
                      labels={"runtimeRange": "Thời lượng (phút)", "avgImdbRating": "Điểm IMDb"},
                      hover_data=["totalMovies"])
        fig1.update_layout(xaxis={"categoryorder": "array", "categoryarray": runtime_order})
        st.plotly_chart(fig1, use_container_width=True)
    
    with col2:
        sorted_runtime_df = runtime_df.sort_values("composite_score", ascending=False)
        fig2 = px.bar(sorted_runtime_df, x="runtimeRange", y="avgImdbRating",
                      title="IMDb trung bình theo thời lượng (Sắp xếp theo điểm tổng hợp)",
                      labels={"runtimeRange": "Thời lượng (phút)", "avgImdbRating": "Điểm IMDb trung bình"},
                      text="totalMovies", color="composite_score")
        fig2.update_traces(texttemplate="%{text} phim", textposition="auto")
        fig2.update_layout(xaxis={"categoryorder": "array", "categoryarray": runtime_order})
        st.plotly_chart(fig2, use_container_width=True)

# ===== TAB 4: Diễn viên & Đạo diễn =====
elif choice == tabs[3]:
    st.subheader("Top diễn viên")
    min_movies = st.sidebar.slider("Số phim tối thiểu (diễn viên):", 1, 50, 10)
    filtered_actors_df = actors_df[actors_df["totalMovies"] >= min_movies].sort_values("composite_score", ascending=False)
    fig1 = px.scatter(filtered_actors_df, x="avgImdbRating", y="avgTomatoesViewerRating",
                      size="totalMovies", color="composite_score", hover_name="actor",
                      title=f"Diễn viên: IMDb vs Tomatoes Rating (≥ {min_movies} phim)",
                      labels={"avgImdbRating": "Điểm IMDb", "avgTomatoesViewerRating": "Điểm Tomatoes"})
    for i, row in filtered_actors_df.head(3).iterrows():
        fig1.add_annotation(x=row["avgImdbRating"], y=row["avgTomatoesViewerRating"],
                           text=f"{row['actor']} ({row['totalMovies']} phim)", showarrow=True)
    st.plotly_chart(fig1, use_container_width=True)

    st.subheader("🎬 Top đạo diễn")
    min_movies_dir = st.sidebar.slider("Số phim tối thiểu (đạo diễn):", 1, 50, 5)
    filtered_directors_df = directors_df[directors_df["totalMovies"] >= min_movies_dir].sort_values("composite_score", ascending=False)
    fig2 = px.scatter(filtered_directors_df, x="avgImdbRating", y="avgTomatoesViewerRating",
                      size="totalMovies", color="composite_score", hover_name="director",
                      title=f"Đạo diễn: IMDb vs Tomatoes Rating (≥ {min_movies_dir} phim)",
                      labels={"avgImdbRating": "Điểm IMDb", "avgTomatoesViewerRating": "Điểm Tomatoes"})
    for i, row in filtered_directors_df.head(3).iterrows():
        fig2.add_annotation(x=row["avgImdbRating"], y=row["avgTomatoesViewerRating"],
                           text=f"{row['director']} ({row['totalMovies']} phim)", showarrow=True)
    st.plotly_chart(fig2, use_container_width=True)

# ===== TAB 5: Thể loại phim =====
elif choice == tabs[4]:
    st.subheader("Phân tích thể loại phim")
    min_movies_genre = st.sidebar.slider("Số phim tối thiểu (thể loại):", 1, 100, 20)
    filtered_genres_df = genres_df[genres_df["totalMovies"] >= min_movies_genre].sort_values("composite_score", ascending=False)
    fig = px.bar(filtered_genres_df, x="_id", y="avgImdbRating",
                 color="composite_score", title=f"Thể loại phim: IMDb trung bình (≥ {min_movies_genre} phim)",
                 labels={"_id": "Thể loại", "avgImdbRating": "Điểm IMDb"},
                 text="totalMovies")
    fig.update_traces(texttemplate="%{text} phim", textposition="auto")
    fig.update_layout(xaxis={"tickangle": 45})
    st.plotly_chart(fig, use_container_width=True)

# ===== TAB 6: Gợi ý tổng hợp =====
elif choice == tabs[5]:
    st.subheader("Gợi ý tổng hợp từ dữ liệu")
    top_months = months_df.sort_values("composite_score", ascending=False).head(2)["monthName"].tolist()
    top_countries = countries_df.sort_values("composite_score", ascending=False).head(3)["country"].tolist()
    top_runtimes = runtime_df.sort_values("composite_score", ascending=False).head(1)["runtimeRange"].tolist()
    top_actors = actors_df[actors_df["totalMovies"] >= 10].sort_values("composite_score", ascending=False).head(3)["actor"].tolist()
    top_directors = directors_df[directors_df["totalMovies"] >= 5].sort_values("composite_score", ascending=False).head(3)["director"].tolist()
    top_genres = genres_df[genres_df["totalMovies"] >= 20].sort_values("composite_score", ascending=False).head(3)["_id"].tolist()

    st.markdown(f"""
    Dựa trên điểm tổng hợp (IMDb: {weight_imdb:.1f}, Số phim: {1 - weight_imdb:.1f}):
    - **Ra mắt vào tháng**: {', '.join(top_months)} để cân bằng IMDb cao và lượng phim lớn.
    - **Hợp tác với các quốc gia**: {', '.join(top_countries)} (xếp hạng theo điểm tổng hợp).
    - **Chọn thời lượng**: {top_runtimes[0]} để tối ưu hóa đánh giá và số lượng phim.
    - **Chọn diễn viên**: {', '.join(top_actors)} (tối thiểu 10 phim).
    - **Đạo diễn nên chọn**: {', '.join(top_directors)} (tối thiểu 5 phim).
    - **Thể loại đề xuất**: {', '.join(top_genres)} (tối thiểu 20 phim).
    """)
    # Radar chart for summary
    radar_data = pd.DataFrame({
        "Category": top_months[:1] + top_countries[:1] + top_runtimes[:1] + top_genres[:1],
        "Score": [
            months_df[months_df["monthName"] == top_months[0]]["composite_score"].iloc[0],
            countries_df[countries_df["country"] == top_countries[0]]["composite_score"].iloc[0],
            runtime_df[runtime_df["runtimeRange"] == top_runtimes[0]]["composite_score"].iloc[0],
            genres_df[genres_df["_id"] == top_genres[0]]["composite_score"].iloc[0]
        ]
    })
    fig = px.line_polar(radar_data, r="Score", theta="Category", line_close=True,
                        title="Tóm tắt gợi ý chiến lược (Điểm tổng hợp)")
    fig.update_traces(fill="toself")
    st.plotly_chart(fig, use_container_width=True)