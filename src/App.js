import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

function App() {
  const [bookmarks, setBookmarks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [editBookmarkData, setEditBookmarkData] = useState({
    category: '',
    url: '',
    description: ''
  });
  const [selectedFilter, setSelectedFilter] = useState('모두');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [formData, setFormData] = useState({
    category: '',
    url: '',
    description: ''
  });

  // 북마크 목록 불러오기
  const fetchBookmarks = async () => {
    try {
      // 먼저 테이블 구조 확인을 위해 데이터를 가져와보기
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        console.error('북마크를 불러오는데 실패했습니다:', error);
        console.log('에러 상세:', error);
        return;
      }

      console.log('현재 북마크 데이터 구조:', data?.[0]);
      console.log('전체 북마크 데이터:', data);
      setBookmarks(data || []);
    } catch (error) {
      console.error('북마크를 불러오는데 실패했습니다:', error);
    }
  };

  // State for categories from DB
  const [categories, setCategories] = useState([]);

  // categories 테이블에서 카테고리 목록 가져오기
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('카테고리 목록을 불러오는데 실패했습니다:', error);
        return;
      }

      console.log('카테고리 목록:', data);
      setCategories(data || []);
    } catch (error) {
      console.error('카테고리 목록을 불러오는데 실패했습니다:', error);
    }
  };

  // 고유 카테고리 목록 가져오기 (categories 테이블에서)
  const getUniqueCategories = () => {
    return categories.map(cat => cat.name);
  };


  // 필터링된 북마크 목록 가져오기
  const getFilteredBookmarks = () => {
    if (selectedFilter === '모두') {
      return bookmarks;
    }
    return bookmarks.filter(bookmark => bookmark.category === selectedFilter);
  };


  // 컴포넌트 마운트 시 로그인 상태 확인 및 북마크 목록 불러오기
  useEffect(() => {
    const savedLoginState = localStorage.getItem('isLoggedIn');
    if (savedLoginState === 'true') {
      setIsLoggedIn(true);
      fetchBookmarks();
      fetchCategories();
    }
  }, []);


  // 새 카테고리 추가
  const handleAddCategory = async () => {
    console.log('카테고리 추가 시작:', newCategoryName);

    if (!newCategoryName.trim()) {
      alert('카테고리 이름을 입력하세요.');
      return;
    }

    // 중복 체크
    if (getUniqueCategories().includes(newCategoryName.trim())) {
      alert('이미 존재하는 카테고리입니다.');
      return;
    }

    try {
      console.log('categories 테이블에 카테고리 추가 중...');
      // categories 테이블에 추가
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }])
        .select();

      console.log('Supabase 응답 - data:', data);
      console.log('Supabase 응답 - error:', error);

      if (error) {
        if (error.code === '23505') { // unique constraint 에러
          alert('이미 존재하는 카테고리입니다.');
        } else {
          console.error('카테고리 추가 실패:', error);
          alert('카테고리 추가에 실패했습니다: ' + error.message);
        }
        return;
      }

      alert(`"${newCategoryName.trim()}" 카테고리가 추가되었습니다.`);
      setNewCategoryName('');
      fetchCategories(); // 카테고리 목록 새로고침
    } catch (error) {
      console.error('카테고리 추가 실패:', error);
      alert('네트워크 오류가 발생했습니다: ' + error.message);
    }
  };

  // 카테고리 이름 수정
  const handleUpdateCategory = async (oldCategory) => {
    if (!editCategoryName.trim()) {
      alert('새 카테고리 이름을 입력하세요.');
      return;
    }

    if (oldCategory === editCategoryName.trim()) {
      setEditingCategory('');
      setEditCategoryName('');
      return;
    }

    // 중복 체크
    if (getUniqueCategories().includes(editCategoryName.trim())) {
      alert('이미 존재하는 카테고리입니다.');
      return;
    }

    try {
      // categories 테이블에서 수정
      const { error: categoryError } = await supabase
        .from('categories')
        .update({ name: editCategoryName.trim() })
        .eq('name', oldCategory);

      if (categoryError) {
        if (categoryError.code === '23505') {
          alert('이미 존재하는 카테고리입니다.');
        } else {
          console.error('카테고리 수정 실패:', categoryError);
          alert('카테고리 수정에 실패했습니다.');
        }
        return;
      }

      // bookmarks 테이블에서도 해당 카테고리의 모든 항목 업데이트
      const { error: bookmarkError } = await supabase
        .from('bookmarks')
        .update({ category: editCategoryName.trim() })
        .eq('category', oldCategory);

      if (bookmarkError) {
        console.error('북마크 카테고리 업데이트 실패:', bookmarkError);
      }

      alert('카테고리가 수정되었습니다.');
      setEditingCategory('');
      setEditCategoryName('');
      fetchCategories(); // 카테고리 목록 새로고침
      fetchBookmarks(); // 북마크 목록도 새로고침
    } catch (error) {
      console.error('카테고리 수정 실패:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (category) => {
    const bookmarksInCategory = bookmarks.filter(b => b.category === category);

    if (bookmarksInCategory.length > 0) {
      if (!window.confirm(`${category} 카테고리에 ${bookmarksInCategory.length}개의 북마크가 있습니다. 카테고리와 모든 북마크를 삭제하시겠습니까?`)) {
        return;
      }

      // 해당 카테고리의 모든 북마크 먼저 삭제
      const { error: bookmarkError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('category', category);

      if (bookmarkError) {
        console.error('북마크 삭제 실패:', bookmarkError);
        alert('북마크 삭제에 실패했습니다.');
        return;
      }
    }

    try {
      // categories 테이블에서 카테고리 삭제
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('name', category);

      if (error) {
        console.error('카테고리 삭제 실패:', error);
        alert('카테고리 삭제에 실패했습니다.');
        return;
      }

      alert('카테고리가 삭제되었습니다.');
      fetchCategories(); // 카테고리 목록 새로고침
      fetchBookmarks(); // 북마크 목록도 새로고침
    } catch (error) {
      console.error('카테고리 삭제 실패:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  // 로그인 상태가 변경될 때 북마크 목록 및 카테고리 불러오기
  useEffect(() => {
    if (isLoggedIn) {
      fetchBookmarks();
      fetchCategories();
    }
  }, [isLoggedIn]);

  // 로그인 폼 입력 처리
  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  // 로그인 처리
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.username === 'admin1' && loginData.password === 'admin123') {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      setLoginData({ username: '', password: '' });
    } else {
      alert('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setBookmarks([]);
  };

  // 북마크 폼 입력 처리
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // URL에서 제목 추출 (간단한 방법)
  const extractTitle = (url) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // URL 정규화 (http/https 자동 추가)
  const normalizeUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // 북마크 추가
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.url) {
      alert('URL은 필수입니다!');
      return;
    }

    try {
      // 현재 최대 order 값을 찾아서 +1 (맨 위에 추가하려면 음수 사용)
      const maxOrder = bookmarks.length > 0 ? Math.max(...bookmarks.map(b => b.order || 0)) : 0;

      const bookmarkData = {
        url: formData.url,
        description: formData.description,
        category: formData.category,
        order: -(Date.now())  // 음수 타임스탬프로 항상 맨 위 보장
      };

      const { error } = await supabase
        .from('bookmarks')
        .insert([bookmarkData]);

      if (error) {
        console.error('북마크 추가 실패:', error);
        console.log('에러 상세:', JSON.stringify(error, null, 2));
        alert('북마크 추가에 실패했습니다: ' + (error.message || JSON.stringify(error)));
        return;
      }

      // 성공 시 바로 폼 초기화하고 모달 닫기 (알림 팝업 없음)
      setFormData({ category: '', url: '', description: '' });
      setShowModal(false);
      fetchBookmarks(); // 목록 새로고침
    } catch (error) {
      console.error('북마크 추가 실패:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  // 북마크 수정 시작
  const handleEditBookmark = (bookmark) => {
    setEditingBookmark(bookmark.id);
    setEditBookmarkData({
      category: bookmark.category,
      url: bookmark.url,
      description: bookmark.description || ''
    });
  };

  // 북마크 수정 저장
  const handleSaveBookmark = async (id) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .update({
          ...editBookmarkData
        })
        .eq('id', id);

      if (error) {
        console.error('북마크 수정 실패:', error);
        alert('북마크 수정에 실패했습니다.');
        return;
      }

      alert('북마크가 수정되었습니다!');
      setEditingBookmark(null);
      fetchBookmarks();
    } catch (error) {
      console.error('북마크 수정 실패:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  // 북마크 수정 취소
  const handleCancelEdit = () => {
    setEditingBookmark(null);
    setEditBookmarkData({ category: '', url: '', description: '' });
  };

  // 북마크 순서 위로 이동
  const handleMoveUp = async (bookmarkId) => {
    console.log('Move up clicked for:', bookmarkId);
    const allBookmarks = [...bookmarks].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = allBookmarks.findIndex(b => b.id === bookmarkId);

    if (currentIndex > 0) {
      const currentBookmark = allBookmarks[currentIndex];
      const previousBookmark = allBookmarks[currentIndex - 1];

      // 순서 교체
      await updateBookmarkOrder(currentBookmark.id, previousBookmark.order || currentIndex - 1);
      await updateBookmarkOrder(previousBookmark.id, currentBookmark.order || currentIndex);

      fetchBookmarks();
    }
  };

  // 북마크 순서 아래로 이동
  const handleMoveDown = async (bookmarkId) => {
    console.log('Move down clicked for:', bookmarkId);
    const allBookmarks = [...bookmarks].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = allBookmarks.findIndex(b => b.id === bookmarkId);

    if (currentIndex < allBookmarks.length - 1) {
      const currentBookmark = allBookmarks[currentIndex];
      const nextBookmark = allBookmarks[currentIndex + 1];

      // 순서 교체
      await updateBookmarkOrder(currentBookmark.id, nextBookmark.order || currentIndex + 1);
      await updateBookmarkOrder(nextBookmark.id, currentBookmark.order || currentIndex);

      fetchBookmarks();
    }
  };

  // 북마크 순서 업데이트
  const updateBookmarkOrder = async (bookmarkId, newOrder) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .update({ order: newOrder })
        .eq('id', bookmarkId);

      if (error) {
        console.error('순서 업데이트 실패:', error);
      }
    } catch (error) {
      console.error('순서 업데이트 실패:', error);
    }
  };

  // 북마크 삭제
  const handleDelete = async (id) => {
    if (window.confirm('이 북마크를 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('북마크 삭제 실패:', error);
          alert('북마크 삭제에 실패했습니다.');
          return;
        }

        alert('북마크가 삭제되었습니다!');
        fetchBookmarks(); // 목록 새로고침
      } catch (error) {
        console.error('북마크 삭제 실패:', error);
        alert('네트워크 오류가 발생했습니다.');
      }
    }
  };

  // 로그인하지 않은 상태
  if (!isLoggedIn) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login-box">
            <h1>📚 나만의 즐겨찾기</h1>
            <p>로그인이 필요합니다</p>
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="username">아이디</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={loginData.username}
                  onChange={handleLoginChange}
                  placeholder="아이디를 입력하세요"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">비밀번호</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <button type="submit" className="login-btn">
                로그인
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="top-header">
        <h2>북마크 목록 ({getFilteredBookmarks().length}개)</h2>
        <div className="top-buttons">
          <button
            onClick={() => setShowModal(true)}
            className="add-btn"
          >
            + 새 북마크 추가
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="category-btn"
          >
            카테고리 편집
          </button>
          <button
            onClick={handleLogout}
            className="logout-btn"
          >
            로그아웃
          </button>
        </div>
      </div>

      <main className="container">
        {/* 북마크 테이블 */}
        <section className="bookmarks-section">
          <div className="table-container">
            <table className="bookmarks-table">
              <thead>
                <tr>
                  <th>
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="header-filter-select"
                    >
                      <option value="모두">모두</option>
                      {getUniqueCategories().map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th>URL</th>
                  <th>설명</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredBookmarks().length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data">
                      {selectedFilter === '모두' ? '아직 북마크가 없습니다. 새 북마크를 추가해보세요!' : `"${selectedFilter}" 카테고리에 북마크가 없습니다.`}
                    </td>
                  </tr>
                ) : (
                  getFilteredBookmarks().map((bookmark) => (
                    <tr key={bookmark.id}>
                      {editingBookmark === bookmark.id ? (
                        <>
                          <td>
                            <select
                              value={editBookmarkData.category}
                              onChange={(e) => {
                                setEditBookmarkData({
                                  ...editBookmarkData,
                                  category: e.target.value
                                });
                              }}
                              className="edit-select"
                            >
                              <option value="">카테고리 선택</option>
                              {getUniqueCategories().map(category => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editBookmarkData.url}
                              onChange={(e) => setEditBookmarkData({
                                ...editBookmarkData,
                                url: e.target.value
                              })}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveBookmark(bookmark.id)}
                              className="edit-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editBookmarkData.description}
                              onChange={(e) => setEditBookmarkData({
                                ...editBookmarkData,
                                description: e.target.value
                              })}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveBookmark(bookmark.id)}
                              className="edit-input"
                            />
                          </td>
                          <td>
                            <div className="move-buttons">
                              <button
                                onClick={() => handleMoveUp(bookmark.id)}
                                className="move-btn"
                                disabled={bookmarks.findIndex(b => b.id === bookmark.id) === 0}
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveDown(bookmark.id)}
                                className="move-btn"
                                disabled={bookmarks.findIndex(b => b.id === bookmark.id) === bookmarks.length - 1}
                              >
                                ▼
                              </button>
                            </div>
                            <button
                              onClick={() => handleSaveBookmark(bookmark.id)}
                              className="save-btn-small"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="cancel-btn-small"
                            >
                              취소
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="category-tag">{bookmark.category}</span>
                          </td>
                          <td>
                            <a
                              href={normalizeUrl(bookmark.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="url-link"
                              title={bookmark.url}
                            >
                              {extractTitle(bookmark.url)}
                            </a>
                          </td>
                          <td className="description-cell">{bookmark.description || '-'}</td>
                          <td>
                            <div className="move-buttons">
                              <button
                                onClick={() => handleMoveUp(bookmark.id)}
                                className="move-btn"
                                disabled={bookmarks.findIndex(b => b.id === bookmark.id) === 0}
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveDown(bookmark.id)}
                                className="move-btn"
                                disabled={bookmarks.findIndex(b => b.id === bookmark.id) === bookmarks.length - 1}
                              >
                                ▼
                              </button>
                            </div>
                            <button
                              onClick={() => handleEditBookmark(bookmark)}
                              className="edit-btn-small"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(bookmark.id)}
                              className="delete-btn"
                            >
                              삭제
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* 북마크 추가 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>새 북마크 추가</h2>
              <button
                onClick={() => setShowModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="bookmark-form">
              <div className="form-group">
                <label htmlFor="category">카테고리</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="">카테고리 선택</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="url">URL *</label>
                <input
                  type="text"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="URL 또는 텍스트 입력"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">설명</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="간단한 설명을 입력하세요"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  취소
                </button>
                <button type="submit" className="submit-btn">
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 카테고리 편집 모달 */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>카테고리 편집</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="category-edit-content">
              <h3>새 카테고리 추가</h3>
              <div className="add-category-form">
                <input
                  type="text"
                  placeholder="새 카테고리 이름"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button onClick={handleAddCategory} className="add-category-btn">
                  추가
                </button>
              </div>

              <h3>현재 카테고리 목록</h3>
              <div className="category-list-edit">
                {getUniqueCategories().map((category) => (
                  <div key={category} className="category-edit-item">
                    {editingCategory === category ? (
                      <div className="category-edit-form">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(category)}
                        />
                        <div className="edit-actions">
                          <button
                            onClick={() => handleUpdateCategory(category)}
                            className="save-btn"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategory('');
                              setEditCategoryName('');
                            }}
                            className="cancel-btn"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="category-display">
                        <span className="category-name">{category}</span>
                        <span className="category-count">
                          ({bookmarks.filter(b => b.category === category).length}개)
                        </span>
                        <div className="category-actions">
                          <button
                            onClick={() => {
                              setEditingCategory(category);
                              setEditCategoryName(category);
                            }}
                            className="edit-btn"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="delete-btn-small"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {getUniqueCategories().length === 0 && (
                <p className="no-categories">아직 카테고리가 없습니다.</p>
              )}
              <div className="modal-actions">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="submit-btn"
                >
                  완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
