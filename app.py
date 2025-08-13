from flask import Flask, render_template

app = Flask(__name__)

# Halaman Publik (status parkiran) — tampil di root /
@app.route('/')
def public_view():
    return render_template('public_wilayah.html')

# Halaman Login — untuk admin
@app.route('/login')
def login():
    return render_template('index.html')

# Halaman panel admin
@app.route('/admin')
def admin():
    return render_template('admin.html')

# Optional: dummy route untuk keperluan pengembangan devtools Chrome
@app.route('/.well-known/appspecific/com.chrome.devtools.json')
def chrome_devtools_dummy():
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)
